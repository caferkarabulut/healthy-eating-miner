using System.Globalization;
using System.Reflection;
using System.Text.Json;
using BiteRoutine.Api.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BiteRoutine.Api.Tests;

public sealed class CatalogSeedTests : IClassFixture<PostgresTestFactory>
{
    private readonly PostgresTestFactory _factory;

    public CatalogSeedTests(PostgresTestFactory factory)
    {
        _factory = factory;
        factory.EnsureSeeded();
    }

    [Fact]
    public async Task RepeatedSeedMatchesOfficialEvidenceAndPreservesIdsUsersAndDiarySnapshots()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BiteRoutineDbContext>();
        db.Users.Add(new IdentityUser { Id = "seed-owner", UserName = "seed-owner" });
        db.Meals.Add(new Meal { MealId = 1001, MealName = "Previous egg name", NutritionSource = "USDA FoodData Central",
            NutritionSourceId = "171287", CaloriesKcalPer100G = 143m, ProteinGPer100G = 12.6m });
        db.DiaryEntries.Add(new DiaryEntry { UserId = "seed-owner", MealId = 1001, MealName = "Previous egg name",
            Date = new DateOnly(2026, 10, 15), Grams = 150.25m, MealSlot = "breakfast", CaloriesKcalPer100G = 143m,
            ProteinGPer100G = 12.6m, CarbsGPer100G = null, FatGPer100G = 0m,
            Source = "Original snapshot source", SourceUrl = "https://example.test/original" });
        await db.SaveChangesAsync();
        // Fixture IDs are explicit; align its isolated identity sequence before exercising the real seed.
        await db.Database.ExecuteSqlRawAsync("SELECT setval(pg_get_serial_sequence('meals', 'meal_id'), (SELECT MAX(meal_id) FROM meals))");
        var diaryBefore = JsonSerializer.Serialize(await db.DiaryEntries.AsNoTracking().ToListAsync());
        var usersBefore = JsonSerializer.Serialize(await db.Users.AsNoTracking().ToListAsync());
        var unrelatedBefore = JsonSerializer.Serialize(await db.Meals.AsNoTracking().Where(x => x.NutritionSource == null).OrderBy(x => x.MealId).ToListAsync());

        using var seedReader = new StreamReader(Assembly.GetExecutingAssembly().GetManifestResourceStream("CatalogSeed.sql")!);
        var seed = await seedReader.ReadToEndAsync();
        using var evidenceStream = Assembly.GetExecutingAssembly().GetManifestResourceStream("CatalogSources.json")!;
        using var evidence = await JsonDocument.ParseAsync(evidenceStream);
        Dictionary<string, int>? firstIds = null;
        foreach (var run in Enumerable.Range(0, 2))
        {
            await db.Database.ExecuteSqlRawAsync(seed);
            db.ChangeTracker.Clear();
            var foods = await db.Meals.AsNoTracking().Where(x => x.NutritionSource == "USDA FoodData Central").ToListAsync();
            Assert.Equal(30, foods.Count);
            Assert.Equal(1001, foods.Single(x => x.NutritionSourceId == "171287").MealId);
            var ids = foods.ToDictionary(x => x.NutritionSourceId!, x => x.MealId);
            if (firstIds is not null) Assert.Equal(firstIds.OrderBy(x => x.Key), ids.OrderBy(x => x.Key));
            firstIds = ids;
            foreach (var source in evidence.RootElement.GetProperty("foods").EnumerateArray())
            {
                var food = Assert.Single(foods, x => x.NutritionSourceId == source.GetProperty("fdcId").GetInt32().ToString(CultureInfo.InvariantCulture));
                Assert.Equal(100, source.GetProperty("basisGrams").GetInt32());
                Assert.Equal(source.GetProperty("turkishName").GetString(), food.MealName);
                Assert.Equal(source.GetProperty("sourceUrl").GetString(), food.NutritionSourceUrl);
                var nutrients = source.GetProperty("nutrients").EnumerateArray().ToArray();
                decimal Amount(int id, string unit)
                {
                    var nutrient = Assert.Single(nutrients, n => n.GetProperty("id").GetInt32() == id);
                    Assert.Equal(unit, nutrient.GetProperty("unit").GetString()!.ToLowerInvariant());
                    var amount = decimal.Parse(nutrient.GetProperty("amount").GetString()!, NumberStyles.Float, CultureInfo.InvariantCulture);
                    return decimal.Round(amount, 2, MidpointRounding.AwayFromZero);
                }
                var energyId = source.GetProperty("dataType").GetString() == "Foundation" ? 2047 : 1008;
                Assert.Equal(Amount(energyId, "kcal"), food.CaloriesKcalPer100G);
                Assert.Equal(Amount(1003, "g"), food.ProteinGPer100G);
                Assert.Equal(Amount(1005, "g"), food.CarbsGPer100G);
                Assert.Equal(Amount(1004, "g"), food.FatGPer100G);
            }
            Assert.Equal(diaryBefore, JsonSerializer.Serialize(await db.DiaryEntries.AsNoTracking().ToListAsync()));
            Assert.Equal(usersBefore, JsonSerializer.Serialize(await db.Users.AsNoTracking().ToListAsync()));
            Assert.Equal(unrelatedBefore, JsonSerializer.Serialize(await db.Meals.AsNoTracking().Where(x => x.NutritionSource == null).OrderBy(x => x.MealId).ToListAsync()));
        }
    }
}
