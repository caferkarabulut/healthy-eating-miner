using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using BiteRoutine.Api.Contracts;
using BiteRoutine.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BiteRoutine.Api.Tests;

public sealed class DiaryEndpointsTests : IClassFixture<PostgresTestFactory>
{
    private readonly PostgresTestFactory _factory;
    private const string Day = "2026-10-15";

    public DiaryEndpointsTests(PostgresTestFactory factory)
    {
        _factory = factory;
        factory.EnsureSeeded();
    }

    [Fact]
    public async Task UsersSeeOnlyTheirOwnEntriesOnSelectedIstanbulDay()
    {
        using var first = await UserAsync();
        using var second = await UserAsync();
        var firstEntry = await CreateAsync(first, 1, 150.25m, Day);
        var secondEntry = await CreateAsync(second, 2, 200m, Day);
        await CreateAsync(first, 3, 100m, "2026-10-16");

        var firstDay = await first.GetFromJsonAsync<DiaryDayResponse>($"/me/diary-entries?date={Day}");
        var secondDay = await second.GetFromJsonAsync<DiaryDayResponse>($"/me/diary-entries?date={Day}");
        Assert.Equal(firstEntry.Id, Assert.Single(firstDay!.Items).Id);
        Assert.Equal(secondEntry.Id, Assert.Single(secondDay!.Items).Id);
        Assert.Equal("Europe/Istanbul", firstDay.TimeZone);
        Assert.Equal(new DateOnly(2026, 10, 15), firstDay.Date);
        Assert.Equal(TimeSpan.Zero, firstEntry.CreatedAtUtc.Offset);
        Assert.True(firstEntry.CreatedAtUtc > new DateTimeOffset(2020, 1, 1, 0, 0, 0, TimeSpan.Zero));
        Assert.Empty((await first.GetFromJsonAsync<DiaryDayResponse>("/me/diary-entries?date=2026-10-14"))!.Items);

        using var spoof = await first.PostAsJsonAsync("/me/diary-entries", new { mealId = 1, grams = 100, date = Day, userId = "someone-else" });
        Assert.Equal(HttpStatusCode.BadRequest, spoof.StatusCode);
    }

    [Fact]
    public async Task NutritionIsScaledAndSnapshotSurvivesCatalogChanges_WhileNullAndZeroStayDistinct()
    {
        int mealId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<BiteRoutineDbContext>();
            var meal = new Meal
            {
                MealId = 1001, MealName = "Snapshot test", CaloriesKcalPer100G = 123.45m,
                ProteinGPer100G = null, CarbsGPer100G = 0m, FatGPer100G = 2.50m,
                NutritionSource = "Test fixture", NutritionSourceId = "snapshot", NutritionSourceUrl = "https://example.test/food"
            };
            db.Meals.Add(meal);
            await db.SaveChangesAsync();
            mealId = meal.MealId;
        }
        using var client = await UserAsync();
        var entry = await CreateAsync(client, mealId, 150m, Day);
        Assert.Equal(185.175m, entry.Nutrition.CaloriesKcal);
        Assert.Null(entry.Nutrition.ProteinG);
        Assert.Equal(0m, entry.Nutrition.CarbsG);
        Assert.Equal(3.75m, entry.Nutrition.FatG);
        Assert.Equal("https://example.test/food", entry.SourceUrl);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<BiteRoutineDbContext>();
            var meal = await db.Meals.SingleAsync(x => x.MealId == mealId);
            meal.MealName = "Changed";
            meal.CaloriesKcalPer100G = 999m;
            meal.NutritionSourceUrl = "https://example.test/changed";
            await db.SaveChangesAsync();
        }
        var listed = Assert.Single((await client.GetFromJsonAsync<DiaryDayResponse>($"/me/diary-entries?date={Day}"))!.Items);
        Assert.Equal(entry, listed);
        using var update = await client.PatchAsJsonAsync($"/me/diary-entries/{entry.Id}", new { grams = 200, date = "2026-10-16" });
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        var edited = (await update.Content.ReadFromJsonAsync<DiaryEntryResponse>())!;
        Assert.Equal(entry.MealId, edited.MealId);
        Assert.Equal(entry.MealName, edited.MealName);
        Assert.Equal(entry.Source, edited.Source);
        Assert.Equal(entry.SourceId, edited.SourceId);
        Assert.Equal(entry.SourceUrl, edited.SourceUrl);
        Assert.Equal(entry.CreatedAtUtc, edited.CreatedAtUtc);
        Assert.Equal(246.9m, edited.Nutrition.CaloriesKcal);
        Assert.Null(edited.Nutrition.ProteinG);
        Assert.Equal(0m, edited.Nutrition.CarbsG);
        Assert.Equal(5m, edited.Nutrition.FatG);
        Assert.Equal(edited, Assert.Single((await client.GetFromJsonAsync<DiaryDayResponse>("/me/diary-entries?date=2026-10-16"))!.Items));
        var unknown = await CreateAsync(client, 1, 100m, Day);
        Assert.Null(unknown.Nutrition.CaloriesKcal);
        Assert.Null(unknown.Nutrition.ProteinG);
    }

    [Theory]
    [InlineData("0")]
    [InlineData("-1")]
    [InlineData("10000.01")]
    [InlineData("0.001")]
    [InlineData("1.234")]
    [InlineData("null")]
    [InlineData("\"NaN\"")]
    [InlineData("\"100\"")]
    public async Task InvalidGramsAreRejectedWithoutSaving(string grams)
    {
        using var client = await UserAsync();
        using var body = new StringContent($"{{\"mealId\":1,\"grams\":{grams},\"date\":\"{Day}\"}}", Encoding.UTF8, "application/json");
        using var response = await client.PostAsync("/me/diary-entries", body);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty((await client.GetFromJsonAsync<DiaryDayResponse>($"/me/diary-entries?date={Day}"))!.Items);
    }

    [Fact]
    public async Task MissingMealIsNotFound_AndValidGramBoundariesAreAccepted()
    {
        using var client = await UserAsync();
        using var missing = await client.PostAsJsonAsync("/me/diary-entries", new { mealId = int.MaxValue, grams = 100, date = Day });
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
        await CreateAsync(client, 1, 0.01m, Day);
        await CreateAsync(client, 1, 10000m, Day);
    }

    [Theory]
    [InlineData("")]
    [InlineData("?date=2026-02-30")]
    [InlineData("?date=15.10.2026")]
    [InlineData("?date=2026-10-15T21:00:00Z")]
    public async Task InvalidListDateIsRejected(string query)
    {
        using var client = await UserAsync();
        using var response = await client.GetAsync($"/me/diary-entries{query}");
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task MissingOrInvalidCreateDateIsRejected()
    {
        using var client = await UserAsync();
        using var missing = await client.PostAsJsonAsync("/me/diary-entries", new { mealId = 1, grams = 100 });
        using var invalid = await client.PostAsJsonAsync("/me/diary-entries", new { mealId = 1, grams = 100, date = "2026-02-30" });
        Assert.Equal(HttpStatusCode.BadRequest, missing.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
    }

    [Fact]
    public async Task AnonymousAccessIsUnauthorized()
    {
        using var client = _factory.CreateClient();
        using var list = await client.GetAsync($"/me/diary-entries?date={Day}");
        using var create = await client.PostAsJsonAsync("/me/diary-entries", new { mealId = 1, grams = 100, date = Day });
        Assert.Equal(HttpStatusCode.Unauthorized, list.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, create.StatusCode);
    }

    [Fact]
    public async Task CookieMutationRequiresApiAntiforgery()
    {
        using var client = _factory.CreateClient();
        var email = $"diary-{Guid.NewGuid():N}@example.test";
        using var register = await client.PostAsJsonAsync("/auth/register", new { email, password = "TestPassword1!" });
        Assert.Equal(HttpStatusCode.OK, register.StatusCode);
        var csrf = await CsrfAsync(client);
        using var loginRequest = new HttpRequestMessage(HttpMethod.Post, "/auth/login?useCookies=true")
        { Content = JsonContent.Create(new { email, password = "TestPassword1!" }) };
        loginRequest.Headers.Add("X-Bite-Routine-Api-Csrf", csrf);
        using var login = await client.SendAsync(loginRequest);
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        using var direct = await client.PostAsJsonAsync("/me/diary-entries", new { mealId = 1, grams = 100, date = Day });
        Assert.Equal(HttpStatusCode.Forbidden, direct.StatusCode);
        csrf = await CsrfAsync(client);
        using var create = new HttpRequestMessage(HttpMethod.Post, "/me/diary-entries")
        { Content = JsonContent.Create(new { mealId = 1, grams = 100, date = Day }) };
        create.Headers.Add("X-Bite-Routine-Api-Csrf", csrf);
        using var response = await client.SendAsync(create);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var entry = (await response.Content.ReadFromJsonAsync<DiaryEntryResponse>())!;
        using var noPatchCsrf = await client.PatchAsJsonAsync($"/me/diary-entries/{entry.Id}", new { grams = 200, date = Day });
        using var noDeleteCsrf = await client.DeleteAsync($"/me/diary-entries/{entry.Id}");
        Assert.Equal(HttpStatusCode.Forbidden, noPatchCsrf.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, noDeleteCsrf.StatusCode);
        foreach (var method in new[] { HttpMethod.Patch, HttpMethod.Delete })
        {
            using var mutation = new HttpRequestMessage(method, $"/me/diary-entries/{entry.Id}");
            if (method == HttpMethod.Patch) mutation.Content = JsonContent.Create(new { grams = 200, date = Day });
            mutation.Headers.Add("X-Bite-Routine-Api-Csrf", await CsrfAsync(client));
            using var result = await client.SendAsync(mutation);
            Assert.Equal(method == HttpMethod.Patch ? HttpStatusCode.OK : HttpStatusCode.NoContent, result.StatusCode);
        }
    }


    [Fact]
    public async Task PatchAndDeleteAreOwnerScoped_AndPersistOnTheSelectedDay()
    {
        using var owner = await UserAsync();
        using var other = await UserAsync();
        var entry = await CreateAsync(owner, 1, 100m, Day);
        foreach (var id in new[] { entry.Id, Guid.NewGuid() })
        {
            using var patch = await other.PatchAsJsonAsync($"/me/diary-entries/{id}", new { grams = 50, date = "2026-10-16" });
            using var delete = await other.DeleteAsync($"/me/diary-entries/{id}");
            Assert.Equal(HttpStatusCode.NotFound, patch.StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, delete.StatusCode);
        }
        Assert.Equal(entry, Assert.Single((await owner.GetFromJsonAsync<DiaryDayResponse>($"/me/diary-entries?date={Day}"))!.Items));
        using var response = await owner.PatchAsJsonAsync($"/me/diary-entries/{entry.Id}", new { grams = 175.25m, date = "2026-10-16" });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = (await response.Content.ReadFromJsonAsync<DiaryEntryResponse>())!;
        Assert.Equal(175.25m, updated.Grams);
        Assert.Equal(new DateOnly(2026, 10, 16), updated.Date);
        Assert.Equal(entry.Id, updated.Id);
        Assert.Equal(entry.CreatedAtUtc, updated.CreatedAtUtc);
        Assert.Empty((await owner.GetFromJsonAsync<DiaryDayResponse>($"/me/diary-entries?date={Day}"))!.Items);
        Assert.Equal(updated, Assert.Single((await owner.GetFromJsonAsync<DiaryDayResponse>("/me/diary-entries?date=2026-10-16"))!.Items));
        using var removed = await owner.DeleteAsync($"/me/diary-entries/{entry.Id}");
        Assert.Equal(HttpStatusCode.NoContent, removed.StatusCode);
        Assert.Empty((await owner.GetFromJsonAsync<DiaryDayResponse>("/me/diary-entries?date=2026-10-16"))!.Items);
        using var again = await owner.DeleteAsync($"/me/diary-entries/{entry.Id}");
        using var missing = await owner.PatchAsJsonAsync($"/me/diary-entries/{entry.Id}", new { grams = 100, date = Day });
        Assert.Equal(HttpStatusCode.NotFound, again.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
    }

    [Theory]
    [InlineData("0.01")]
    [InlineData("10000")]
    public async Task PatchAcceptsGramBoundaries(string grams)
    {
        using var client = await UserAsync();
        var entry = await CreateAsync(client, 1, 100m, Day);
        using var content = new StringContent($"{{\"grams\":{grams},\"date\":\"{Day}\"}}", Encoding.UTF8, "application/json");
        using var response = await client.PatchAsync($"/me/diary-entries/{entry.Id}", content);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(decimal.Parse(grams, System.Globalization.CultureInfo.InvariantCulture), (await response.Content.ReadFromJsonAsync<DiaryEntryResponse>())!.Grams);
    }

    [Theory]
    [InlineData("{}")]
    [InlineData("{\"grams\":100}")]
    [InlineData("{\"date\":\"2026-10-15\"}")]
    [InlineData("{\"grams\":null,\"date\":\"2026-10-15\"}")]
    [InlineData("{\"grams\":0,\"date\":\"2026-10-15\"}")]
    [InlineData("{\"grams\":-1,\"date\":\"2026-10-15\"}")]
    [InlineData("{\"grams\":10000.01,\"date\":\"2026-10-15\"}")]
    [InlineData("{\"grams\":1.234,\"date\":\"2026-10-15\"}")]
    [InlineData("{\"grams\":\"150,25\",\"date\":\"2026-10-15\"}")]
    [InlineData("{\"grams\":100,\"date\":null}")]
    [InlineData("{\"grams\":100,\"date\":\"2026-02-30\"}")]
    [InlineData("{\"grams\":100,\"date\":\"15.10.2026\"}")]
    [InlineData("{\"grams\":100,\"date\":\"2026-10-15\",\"mealId\":2}")]
    [InlineData("{\"grams\":100,\"date\":\"2026-10-15\",\"userId\":\"other\"}")]
    public async Task InvalidPatchLeavesEntryUnchanged(string json)
    {
        using var client = await UserAsync();
        var entry = await CreateAsync(client, 1, 100m, Day);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");
        using var response = await client.PatchAsync($"/me/diary-entries/{entry.Id}", content);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(entry, Assert.Single((await client.GetFromJsonAsync<DiaryDayResponse>($"/me/diary-entries?date={Day}"))!.Items));
    }

    [Fact]
    public async Task AnonymousPatchAndDeleteAreUnauthorized()
    {
        using var client = _factory.CreateClient();
        var id = Guid.NewGuid();
        using var patch = await client.PatchAsJsonAsync($"/me/diary-entries/{id}", new { grams = 100, date = Day });
        using var delete = await client.DeleteAsync($"/me/diary-entries/{id}");
        Assert.Equal(HttpStatusCode.Unauthorized, patch.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, delete.StatusCode);
    }

    [Fact]
    public async Task SummaryUsesScaledSnapshots_AndStaysScopedAndCurrentAfterMutations()
    {
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<BiteRoutineDbContext>();
            db.Meals.AddRange(
                new Meal { MealId = 1101, MealName = "Summary A", CaloriesKcalPer100G = 123.45m, ProteinGPer100G = 1.23m, CarbsGPer100G = 0m, FatGPer100G = 2.5m },
                new Meal { MealId = 1102, MealName = "Summary B", CaloriesKcalPer100G = 200.12m, ProteinGPer100G = 3.45m, CarbsGPer100G = 5.67m, FatGPer100G = 0m });
            await db.SaveChangesAsync();
        }
        using var owner = await UserAsync();
        using var other = await UserAsync();
        Assert.Equal(new DiarySummaryResponse(0, 0m, 0m, 0m, 0m), (await DayAsync(owner, Day)).Summary);
        var first = await CreateAsync(owner, 1101, 33.33m, Day);
        var second = await CreateAsync(owner, 1102, 77.77m, Day);
        await CreateAsync(other, 1101, 100m, Day);
        await CreateAsync(owner, 1102, 100m, "2026-10-17");
        var expected = new DiarySummaryResponse(2, 196.779209m, 3.093024m, 4.409559m, 0.83325m);
        Assert.Equal(expected, (await DayAsync(owner, Day)).Summary);
        Assert.Equal(new DiarySummaryResponse(1, 123.45m, 1.23m, 0m, 2.5m), (await DayAsync(other, Day)).Summary);
        Assert.Equal(new DiarySummaryResponse(1, 200.12m, 3.45m, 5.67m, 0m), (await DayAsync(owner, "2026-10-17")).Summary);
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<BiteRoutineDbContext>();
            var meal = await db.Meals.SingleAsync(x => x.MealId == 1101);
            meal.CaloriesKcalPer100G = 999m; meal.ProteinGPer100G = null;
            meal.CarbsGPer100G = 999m; meal.FatGPer100G = null;
            await db.SaveChangesAsync();
        }
        Assert.Equal(expected, (await DayAsync(owner, Day)).Summary);
        using var edit = await owner.PatchAsJsonAsync($"/me/diary-entries/{first.Id}", new { grams = 50, date = Day });
        Assert.Equal(HttpStatusCode.OK, edit.StatusCode);
        Assert.Equal(new DiarySummaryResponse(2, 217.358324m, 3.298065m, 4.409559m, 1.25m), (await DayAsync(owner, Day)).Summary);
        using var move = await owner.PatchAsJsonAsync($"/me/diary-entries/{first.Id}", new { grams = 50, date = "2026-10-16" });
        Assert.Equal(HttpStatusCode.OK, move.StatusCode);
        Assert.Equal(new DiarySummaryResponse(1, 155.633324m, 2.683065m, 4.409559m, 0m), (await DayAsync(owner, Day)).Summary);
        Assert.Equal(new DiarySummaryResponse(1, 61.725m, 0.615m, 0m, 1.25m), (await DayAsync(owner, "2026-10-16")).Summary);
        using var deleteFirst = await owner.DeleteAsync($"/me/diary-entries/{first.Id}");
        using var deleteSecond = await owner.DeleteAsync($"/me/diary-entries/{second.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteFirst.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, deleteSecond.StatusCode);
        Assert.Equal(new DiarySummaryResponse(0, 0m, 0m, 0m, 0m), (await DayAsync(owner, Day)).Summary);
        Assert.Equal(new DiarySummaryResponse(0, 0m, 0m, 0m, 0m), (await DayAsync(owner, "2026-10-16")).Summary);
        Assert.Equal(1, (await DayAsync(other, Day)).Summary.EntryCount);
    }

    [Fact]
    public async Task MissingNutrientsInvalidateOnlyTheirOwnTotals_WhileZeroIsKnown()
    {
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<BiteRoutineDbContext>();
            db.Meals.AddRange(
                new Meal { MealId = 1111, MealName = "Partial A", CaloriesKcalPer100G = 10m, ProteinGPer100G = null, CarbsGPer100G = 0m, FatGPer100G = 2m },
                new Meal { MealId = 1112, MealName = "Partial B", CaloriesKcalPer100G = 20m, ProteinGPer100G = 4m, CarbsGPer100G = 0m, FatGPer100G = null });
            await db.SaveChangesAsync();
        }
        using var owner = await UserAsync();
        using var other = await UserAsync();
        var first = await CreateAsync(owner, 1111, 50m, Day);
        Assert.Equal(new DiarySummaryResponse(1, 5m, null, 0m, 1m), (await DayAsync(owner, Day)).Summary);
        var second = await CreateAsync(owner, 1112, 200m, Day);
        Assert.Equal(new DiarySummaryResponse(2, 45m, null, 0m, null), (await DayAsync(owner, Day)).Summary);
        await CreateAsync(other, 1, 100m, Day);
        await CreateAsync(owner, 1, 100m, "2026-10-16");
        Assert.Equal(new DiarySummaryResponse(2, 45m, null, 0m, null), (await DayAsync(owner, Day)).Summary);
        using var delete = await owner.DeleteAsync($"/me/diary-entries/{first.Id}");
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        Assert.Equal(new DiarySummaryResponse(1, 40m, 8m, 0m, null), (await DayAsync(owner, Day)).Summary);
        using var move = await owner.PatchAsJsonAsync($"/me/diary-entries/{second.Id}", new { grams = 50, date = "2026-10-16" });
        Assert.Equal(HttpStatusCode.OK, move.StatusCode);
        Assert.Equal(new DiarySummaryResponse(0, 0m, 0m, 0m, 0m), (await DayAsync(owner, Day)).Summary);
        Assert.Equal(new DiarySummaryResponse(2, null, null, null, null), (await DayAsync(owner, "2026-10-16")).Summary);
    }

    private static async Task<DiaryDayResponse> DayAsync(HttpClient client, string day) =>
        (await client.GetFromJsonAsync<DiaryDayResponse>($"/me/diary-entries?date={day}"))!;

    private async Task<HttpClient> UserAsync()
    {
        var client = _factory.CreateClient();
        var email = $"diary-{Guid.NewGuid():N}@example.test";
        using var register = await client.PostAsJsonAsync("/auth/register", new { email, password = "TestPassword1!" });
        Assert.Equal(HttpStatusCode.OK, register.StatusCode);
        using var login = await client.PostAsJsonAsync("/auth/login", new { email, password = "TestPassword1!" });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        using var json = JsonDocument.Parse(await login.Content.ReadAsStringAsync());
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", json.RootElement.GetProperty("accessToken").GetString());
        return client;
    }

    private static async Task<DiaryEntryResponse> CreateAsync(HttpClient client, int mealId, decimal grams, string date)
    {
        using var response = await client.PostAsJsonAsync("/me/diary-entries", new { mealId, grams, date });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal($"/me/diary-entries?date={date}", response.Headers.Location?.OriginalString);
        return (await response.Content.ReadFromJsonAsync<DiaryEntryResponse>())!;
    }

    private static async Task<string> CsrfAsync(HttpClient client)
    {
        using var response = await client.GetAsync("/auth/antiforgery");
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return json.RootElement.GetProperty("requestToken").GetString()!;
    }
}
