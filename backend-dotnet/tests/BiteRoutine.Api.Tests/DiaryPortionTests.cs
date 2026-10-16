using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using BiteRoutine.Api.Contracts;
using BiteRoutine.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BiteRoutine.Api.Tests;

public sealed class DiaryPortionTests : IClassFixture<PostgresTestFactory>
{
    private readonly PostgresTestFactory factory;
    public DiaryPortionTests(PostgresTestFactory factory) { this.factory = factory; factory.EnsureSeeded(); }
    private async Task<HttpClient> User()
    {
        var client = factory.CreateClient();
        var credentials = new { email = $"portion-{Guid.NewGuid():N}@example.test", password = "TestPassword1!" };
        (await client.PostAsJsonAsync("/auth/register", credentials)).EnsureSuccessStatusCode();
        var login = await client.PostAsJsonAsync("/auth/login", credentials);
        var token = JsonDocument.Parse(await login.Content.ReadAsStringAsync()).RootElement.GetProperty("accessToken").GetString();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }
    private async Task<FoodPortion> Measure(decimal amount = 10, decimal grams = 60)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BiteRoutineDbContext>();
        var p = new FoodPortion { MealId = 1, Amount = amount, GramWeight = grams, MeasureName = "Halka", Source = "Fixture",
            SourceId = Guid.NewGuid().ToString(), SourceFoodId = "fixture-food", SourceDescription = "rings", SourceUrl = "https://example.test/source" };
        db.FoodPortions.Add(p); await db.SaveChangesAsync(); return p;
    }
    [Theory]
    [InlineData(10, 60, 1.5, 9)]
    [InlineData(0.5, 86, 2.5, 430)]
    [InlineData(1, 1.005, 1, 1.01)]
    [InlineData(1, 1, 0.005, 0.01)]
    [InlineData(1, 1, 10000, 10000)]
    [InlineData(1, 1, 10000.004, 10000)]
    public async Task ConvertsSourceAmountAndRoundsAwayFromZero(double amount, double grams, double quantity, double expected)
    {
        var p = await Measure((decimal)amount, (decimal)grams); using var client = await User();
        var response = await client.PostAsJsonAsync("/me/diary-entries", new { mealId = 1, portionId = p.Id, quantity, date = "2026-10-16" });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var entry = (await response.Content.ReadFromJsonAsync<DiaryEntryResponse>())!;
        Assert.Equal((decimal)expected, entry.Grams); Assert.Equal((decimal)quantity, entry.Portion!.Quantity);
        Assert.Equal(p.GramWeight, entry.Portion.SourceGramWeight); Assert.Equal(p.Amount, entry.Portion.SourceAmount);
        Assert.Equal(p.SourceId, entry.Portion.SourceId); Assert.Null(entry.Nutrition.ProteinG);
    }
    [Fact]
    public async Task PreservesCopyOnDateSlotChangesAndLiveSourceChangesThenSupportsLegacyGrams()
    {
        var p = await Measure(); using var owner = await User(); using var other = await User();
        var response = await owner.PostAsJsonAsync("/me/diary-entries", new { mealId = 1, portionId = p.Id, quantity = 1.5m, date = "2026-10-16" });
        var before = (await response.Content.ReadFromJsonAsync<DiaryEntryResponse>())!;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<BiteRoutineDbContext>();
            await db.FoodPortions.Where(x => x.Id == p.Id).ExecuteUpdateAsync(s => s.SetProperty(x => x.GramWeight, 999m).SetProperty(x => x.MeasureName, "Changed"));
        }
        var foreign = await other.PatchAsJsonAsync($"/me/diary-entries/{before.Id}", new { date = "2026-10-17" });
        Assert.Equal(HttpStatusCode.NotFound, foreign.StatusCode);
        var edit = await owner.PatchAsJsonAsync($"/me/diary-entries/{before.Id}", new { date = "2026-10-17", mealSlot = "dinner" });
        Assert.Equal(HttpStatusCode.OK, edit.StatusCode);
        var after = (await edit.Content.ReadFromJsonAsync<DiaryEntryResponse>())!;
        Assert.Equal(before.Grams, after.Grams); Assert.Equal(before.Portion, after.Portion); Assert.Equal(before.Nutrition, after.Nutrition);
        var listed = Assert.Single((await owner.GetFromJsonAsync<DiaryDayResponse>("/me/diary-entries?date=2026-10-17"))!.Items);
        Assert.Equal(after, listed);
        var replace = await owner.PatchAsJsonAsync($"/me/diary-entries/{before.Id}", new { grams = 150.25m, date = "2026-10-17" });
        var gramEntry = (await replace.Content.ReadFromJsonAsync<DiaryEntryResponse>())!;
        Assert.Null(gramEntry.Portion); Assert.Equal(150.25m, gramEntry.Grams);
        var portionEdit = await owner.PatchAsJsonAsync($"/me/diary-entries/{before.Id}", new { portionId = p.Id, quantity = 0.5m, date = "2026-10-17" });
        var updated = (await portionEdit.Content.ReadFromJsonAsync<DiaryEntryResponse>())!;
        Assert.Equal(49.95m, updated.Grams); Assert.Equal("Changed", updated.Portion!.MeasureName);
        Assert.Equal(before.MealName, updated.MealName); Assert.Equal(before.SourceUrl, updated.SourceUrl);
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<BiteRoutineDbContext>();
            await db.FoodPortions.Where(x => x.Id == p.Id).ExecuteDeleteAsync();
        }
        var move = await owner.PatchAsJsonAsync($"/me/diary-entries/{before.Id}", new { date = "2026-10-18", mealSlot = "snack" });
        var moved = (await move.Content.ReadFromJsonAsync<DiaryEntryResponse>())!;
        Assert.Equal(updated.Portion, moved.Portion); Assert.Equal(updated.Grams, moved.Grams);

    }
    [Fact]
    public async Task RejectsConflictsIncompleteAmountsOtherFoodsAndOutOfRangeConversions()
    {
        var p = await Measure(1, 1); using var client = await User();
        var legacy = await client.PostAsJsonAsync("/me/diary-entries", new { mealId = 1, grams = 10, date = "2026-10-16" });
        var entry = (await legacy.Content.ReadFromJsonAsync<DiaryEntryResponse>())!;
        Assert.Null(entry.Portion);
        var invalid = new object[] {
            new { grams = 10, portionId = p.Id, quantity = 1 }, new { portionId = p.Id }, new { quantity = 1 }, new { },
            new { portionId = p.Id, quantity = 0 }, new { portionId = p.Id, quantity = -1 },
            new { portionId = p.Id, quantity = 0.004m }, new { portionId = p.Id, quantity = 10000.01m },
            new { portionId = p.Id, quantity = decimal.MaxValue }, new { portionId = long.MaxValue, quantity = 1 },
            new { grams = 10, quantity = 1 }, new { grams = 10, portionId = p.Id },
            new { grams = (decimal?)null }, new { portionId = (long?)null, quantity = 1 }, new { portionId = p.Id, quantity = (decimal?)null },
            new { portionId = p.Id, quantity = 1, gramWeight = 10 }
        };
        foreach (var amount in invalid)
        {
            var payload = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(JsonSerializer.Serialize(amount))!;
            payload["date"] = JsonSerializer.SerializeToElement("2026-10-16");
            // A date-only PATCH deliberately preserves the existing quantity.
            if (payload.Count > 1)
            {
                var patch = await client.PatchAsJsonAsync($"/me/diary-entries/{entry.Id}", payload);
                Assert.Equal(HttpStatusCode.BadRequest, patch.StatusCode);
            }
            payload["mealId"] = JsonSerializer.SerializeToElement(1);
            var post = await client.PostAsJsonAsync("/me/diary-entries", payload);
            Assert.Equal(HttpStatusCode.BadRequest, post.StatusCode);
        }
        var wrong = await client.PostAsJsonAsync("/me/diary-entries", new { mealId = 2, portionId = p.Id, quantity = 1, date = "2026-10-16" });
        Assert.Equal(HttpStatusCode.BadRequest, wrong.StatusCode);
        var otherMeal = await client.PostAsJsonAsync("/me/diary-entries", new { mealId = 2, grams = 1, date = "2026-10-16" });
        var second = (await otherMeal.Content.ReadFromJsonAsync<DiaryEntryResponse>())!;
        var wrongPatch = await client.PatchAsJsonAsync($"/me/diary-entries/{second.Id}", new { portionId = p.Id, quantity = 1, date = "2026-10-16" });
        Assert.Equal(HttpStatusCode.BadRequest, wrongPatch.StatusCode);
    }
}
