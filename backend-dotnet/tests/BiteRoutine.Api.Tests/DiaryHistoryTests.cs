using System.Collections.Concurrent;
using System.Data.Common;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using BiteRoutine.Api.Contracts;
using BiteRoutine.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

namespace BiteRoutine.Api.Tests;

public sealed class DiaryHistoryTests : IClassFixture<PostgresTestFactory>
{
    private readonly PostgresTestFactory _factory;
    public DiaryHistoryTests(PostgresTestFactory factory) { _factory = factory; factory.EnsureSeeded(); }

    [Theory]
    [InlineData("2027-01-03", "2026-12-28")]
    [InlineData("2024-03-03", "2024-02-26")]
    [InlineData("0001-01-07", "0001-01-01")]
    [InlineData("9999-12-31", "9999-12-25")]
    public async Task SevenCalendarDaysAreInclusiveOrderedAndUserScoped(string end, string start)
    {
        using var owner = await UserAsync();
        using var other = await UserAsync();
        var firstDay = DateOnly.Parse(start);
        await Create(owner, 1, 100, start);
        await Create(owner, 2, 50, end);
        await Create(other, 3, 75, end);
        if (firstDay.DayNumber > 0) await Create(owner, 1, 100, firstDay.AddDays(-1).ToString("yyyy-MM-dd"));
        if (end != "9999-12-31") await Create(owner, 1, 100, DateOnly.Parse(end).AddDays(1).ToString("yyyy-MM-dd"));
        using var response = await owner.GetAsync($"/me/diary-summary?endDate={end}");
        response.EnsureSuccessStatusCode();
        Assert.True(response.Headers.CacheControl!.NoStore);
        var history = (await response.Content.ReadFromJsonAsync<DiaryHistoryResponse>())!;
        Assert.Equal(firstDay, history.StartDate);
        Assert.Equal(DateOnly.Parse(end), history.EndDate);
        Assert.Equal("Europe/Istanbul", history.TimeZone);
        Assert.Equal(Enumerable.Range(0, 7).Select(i => firstDay.AddDays(i)), history.Days.Select(x => x.Date));
        Assert.Equal(2, history.Days.Sum(x => x.Summary.EntryCount));
        Assert.Equal(1, history.Days[0].Summary.EntryCount);
        Assert.Equal(1, history.Days[6].Summary.EntryCount);
        foreach (var empty in history.Days.Skip(1).Take(5))
            Assert.Equal(new DiarySummaryResponse(0, 0, 0, 0, 0), empty.Summary);
        var otherHistory = await History(other, end);
        Assert.Equal(1, otherHistory.Days.Sum(x => x.Summary.EntryCount));
        Assert.Equal(0, otherHistory.Days[0].Summary.EntryCount);
    }

    [Theory]
    [InlineData("")]
    [InlineData("?endDate=2026-2-01")]
    [InlineData("?endDate=2026-02-30")]
    [InlineData("?endDate=2026-10-15T00:00:00Z")]
    [InlineData("?endDate=0001-01-06")]
    [InlineData("?endDate=0000-01-07")]
    public async Task EndDateIsRequiredAndStrict(string query)
    {
        using var client = await UserAsync();
        using var response = await client.GetAsync($"/me/diary-summary{query}");
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task HistoryReadsDiaryRangeWithOneDatabaseQuery()
    {
        using var owner = await UserAsync();
        var commands = new CommandCapture();
        using var observed = _factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
            services.AddDbContext<BiteRoutineDbContext>(options => options.AddInterceptors(commands))));
        using var client = observed.CreateClient();
        client.DefaultRequestHeaders.Authorization = owner.DefaultRequestHeaders.Authorization;
        await History(client, "2026-10-15");
        var diaryQuery = Assert.Single(commands.Sql, sql => sql.Contains("FROM diary_entries"));
        Assert.Contains(">=", diaryQuery);
        Assert.Contains("<=", diaryQuery);
        Assert.Contains("user_id", diaryQuery);
        commands.Sql.Clear();
        var day = await client.GetFromJsonAsync<DiaryDayResponse>("/me/diary-entries?date=2026-10-15");
        Assert.Equal(5, day!.MealSummaries.Count);
        Assert.Single(commands.Sql, sql => sql.Contains("FROM diary_entries"));
    }

    private sealed class CommandCapture : DbCommandInterceptor
    {
        public ConcurrentQueue<string> Sql { get; } = new();
        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(DbCommand command,
            CommandEventData eventData, InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
        {
            Sql.Enqueue(command.CommandText);
            return ValueTask.FromResult(result);
        }
    }

    [Fact]
    public async Task AnonymousIsRejected()
    {
        using var client = _factory.CreateClient();
        using var response = await client.GetAsync("/me/diary-summary?endDate=2026-10-15");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SnapshotsNullZeroAndUnroundedTotalsFollowCreateEditMoveAndDelete()
    {
        using var owner = await UserAsync();
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<BiteRoutineDbContext>();
            db.Meals.Add(new Meal { MealId = 1401, MealName = "History fixture", CaloriesKcalPer100G = 123.45m,
                ProteinGPer100G = null, CarbsGPer100G = 0, FatGPer100G = 2.5m });
            await db.SaveChangesAsync();
        }
        var entry = await Create(owner, 1401, 150.25m, "2026-10-15");
        await Create(owner, 1401, 33.33m, "2026-10-15");
        var initial = (await History(owner, "2026-10-15")).Days[6].Summary;
        Assert.Equal(new DiarySummaryResponse(2, 226.62951m, null, 0, 4.5895m), initial);
        var day = (await owner.GetFromJsonAsync<DiaryDayResponse>("/me/diary-entries?date=2026-10-15"))!;
        Assert.Equal(day.Summary, initial);
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<BiteRoutineDbContext>();
            var meal = await db.Meals.SingleAsync(x => x.MealId == 1401);
            meal.CaloriesKcalPer100G = 999; meal.ProteinGPer100G = 99;
            await db.SaveChangesAsync();
        }
        Assert.Equal(initial, (await History(owner, "2026-10-15")).Days[6].Summary);
        using var patch = await owner.PatchAsJsonAsync($"/me/diary-entries/{entry.Id}", new { grams = 200, date = "2026-10-14", mealSlot = "lunch" });
        patch.EnsureSuccessStatusCode();
        var edited = await History(owner, "2026-10-15");
        Assert.Equal(new DiarySummaryResponse(1, 246.9m, null, 0, 5m), edited.Days[5].Summary);
        Assert.Equal(new DiarySummaryResponse(1, 41.145885m, null, 0, 0.83325m), edited.Days[6].Summary);
        using var delete = await owner.DeleteAsync($"/me/diary-entries/{entry.Id}");
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        Assert.Equal(new DiarySummaryResponse(0, 0, 0, 0, 0), (await History(owner, "2026-10-15")).Days[5].Summary);
    }

    private static async Task<DiaryHistoryResponse> History(HttpClient client, string end) =>
        (await client.GetFromJsonAsync<DiaryHistoryResponse>($"/me/diary-summary?endDate={end}"))!;
    private static async Task<DiaryEntryResponse> Create(HttpClient client, int mealId, decimal grams, string date)
    {
        using var response = await client.PostAsJsonAsync("/me/diary-entries", new { mealId, grams, date });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<DiaryEntryResponse>())!;
    }
    private async Task<HttpClient> UserAsync()
    {
        var client = _factory.CreateClient();
        var email = $"history-{Guid.NewGuid():N}@example.test";
        using var register = await client.PostAsJsonAsync("/auth/register", new { email, password = "TestPassword1!" });
        register.EnsureSuccessStatusCode();
        using var login = await client.PostAsJsonAsync("/auth/login", new { email, password = "TestPassword1!" });
        login.EnsureSuccessStatusCode();
        using var json = JsonDocument.Parse(await login.Content.ReadAsStringAsync());
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", json.RootElement.GetProperty("accessToken").GetString());
        return client;
    }
}
