using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Reflection;
using System.Text.Json;
using BiteRoutine.Api.Contracts;
using BiteRoutine.Api.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace BiteRoutine.Api.Tests;

public sealed class FoodPortionTests : IClassFixture<PostgresTestFactory>
{
    private readonly PostgresTestFactory _factory;
    public FoodPortionTests(PostgresTestFactory factory)
    {
        _factory = factory; factory.EnsureSeeded();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BiteRoutineDbContext>();
        db.Database.ExecuteSqlRaw("SELECT setval(pg_get_serial_sequence('meals', 'meal_id'), (SELECT MAX(meal_id) FROM meals))");
        db.Database.ExecuteSqlRaw(Resource("CatalogSeed.sql"));
        db.Database.ExecuteSqlRaw(Resource("PortionSeed.sql"));
    }
    private static string Resource(string name)
    {
        using var reader = new StreamReader(Assembly.GetExecutingAssembly().GetManifestResourceStream(name)!);
        return reader.ReadToEnd();
    }

    [Fact]
    public async Task RepeatedSeedMatchesFoodDetailsAndPreservesExistingDataAndPortionIds()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BiteRoutineDbContext>();
        var egg = await db.Meals.SingleAsync(x => x.NutritionSourceId == "171287");
        var user = new IdentityUser { Id = $"portion-{Guid.NewGuid():N}", UserName = $"portion-{Guid.NewGuid():N}" };
        db.Users.Add(user);
        db.FavoriteMeals.Add(new FavoriteMeal { UserId = user.Id, MealId = egg.MealId });
        db.DiaryEntries.Add(new DiaryEntry { UserId = user.Id, MealId = egg.MealId, MealName = "Original snapshot", Grams = 111.25m,
            Date = new DateOnly(2026, 10, 16), CaloriesKcalPer100G = 12.34m, ProteinGPer100G = null, CarbsGPer100G = 0, FatGPer100G = 1.2m });
        await db.SaveChangesAsync();
        async Task<string> Existing() => JsonSerializer.Serialize(new {
            meals = await db.Meals.AsNoTracking().OrderBy(x => x.MealId).ToListAsync(),
            users = await db.Users.AsNoTracking().OrderBy(x => x.Id).ToListAsync(),
            diary = await db.DiaryEntries.AsNoTracking().OrderBy(x => x.Id).ToListAsync(),
            favorites = await db.FavoriteMeals.AsNoTracking().OrderBy(x => x.UserId).ThenBy(x => x.MealId).ToListAsync() });
        var before = await Existing();
        var original = JsonSerializer.Serialize(await db.FoodPortions.AsNoTracking().OrderBy(x => x.Id).ToListAsync());
        await db.FoodPortions.Where(x => x.SourceId == "88374").ExecuteUpdateAsync(setters =>
            setters.SetProperty(x => x.MeasureName, "Stale label").SetProperty(x => x.GramWeight, 999m));
        using var evidence = JsonDocument.Parse(Resource("PortionSources.json"));
        foreach (var run in Enumerable.Range(0, 2))
        {
            await db.Database.ExecuteSqlRawAsync(Resource("PortionSeed.sql"));
            Assert.Equal(before, await Existing());
            var portions = await db.FoodPortions.AsNoTracking().OrderBy(x => x.Id).ToListAsync();
            Assert.Equal(original, JsonSerializer.Serialize(portions));
            Assert.Equal(64, portions.Count);
            foreach (var food in evidence.RootElement.GetProperty("foods").EnumerateArray())
            {
                var foodId = food.GetProperty("fdcId").GetInt32().ToString(CultureInfo.InvariantCulture);
                var meal = await db.Meals.SingleAsync(x => x.NutritionSourceId == foodId);
                foreach (var item in food.GetProperty("reviewedPortions").EnumerateArray().Where(x => x.GetProperty("accepted").GetBoolean()))
                {
                    var sourceId = item.GetProperty("id").GetInt32().ToString(CultureInfo.InvariantCulture);
                    var portion = Assert.Single(portions, x => x.SourceId == sourceId);
                    Assert.Equal(meal.MealId, portion.MealId); Assert.Equal(foodId, portion.SourceFoodId);
                    Assert.Equal(item.GetProperty("measureName").GetString(), portion.MeasureName);
                    var description = item.TryGetProperty("portionDescription", out var explicitDescription)
                        ? explicitDescription.GetString() : item.GetProperty("modifier").GetString();
                    Assert.Equal(description, portion.SourceDescription);
                    var amount = decimal.Parse(item.GetProperty("amountUsed").GetString()!, CultureInfo.InvariantCulture);
                    var weight = decimal.Parse(item.GetProperty("gramWeight").ToString(), CultureInfo.InvariantCulture);
                    Assert.Equal(amount, portion.Amount); Assert.Equal(weight, portion.GramWeight);
                    Assert.Equal(weight / amount, FoodPortionResponse.From(portion).GramsPerUnit);
                    Assert.Equal(food.GetProperty("sourceUrl").GetString(), portion.SourceUrl);
                }
            }
        }
    }

    [Fact]
    public async Task PublicEndpointSeparatesFoodsSizesAndNormalizesActualSourceAmounts()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BiteRoutineDbContext>();
        using var client = _factory.CreateClient();
        async Task<FoodPortionListResponse> Get(string foodId)
        {
            var id = (await db.Meals.SingleAsync(x => x.NutritionSourceId == foodId)).MealId;
            return (await client.GetFromJsonAsync<FoodPortionListResponse>($"/meals/{id}/portions"))!;
        }
        var eggs = await Get("171287");
        Assert.Equal(5, eggs.Items.Count);
        Assert.Equal(new decimal[] { 38, 44, 50, 56, 63 }, eggs.Items.Select(x => x.GramsPerUnit).Order());
        Assert.All(eggs.Items, x => { Assert.Equal(eggs.MealId, x.MealId); Assert.Equal("171287", x.SourceFoodId); Assert.True(x.Approximate); });
        var chicken = Assert.Single((await Get("171477")).Items, x => x.SourceId == "88819");
        Assert.Equal(0.5m, chicken.Amount); Assert.Equal(86, chicken.GramWeight); Assert.Equal(172, chicken.GramsPerUnit);
        var rings = Assert.Single((await Get("170000")).Items, x => x.SourceId == "85864");
        Assert.Equal(10, rings.Amount); Assert.Equal(60, rings.GramWeight); Assert.Equal(6, rings.GramsPerUnit);
        var rice = Assert.Single((await Get("2708408")).Items);
        Assert.Equal("1 cup, cooked", rice.SourceDescription); Assert.Equal(1, rice.Amount); Assert.Equal(158, rice.GramsPerUnit);
        foreach (var id in new[] { "2259793", "1750340" }) Assert.Empty((await Get(id)).Items);
        Assert.DoesNotContain((await Get("172420")).Items, x => x.SourceFoodId == "172421");
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/meals/2147483647/portions")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/meals/0/portions")).StatusCode);
    }

    [Fact]
    public async Task SeedRefusesToReassignAnExistingSourcePortionToAnotherFood()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BiteRoutineDbContext>();
        var original = await db.FoodPortions.AsNoTracking().FirstAsync(x => x.SourceFoodId == "171287");
        await db.FoodPortions.Where(x => x.Id == original.Id).ExecuteUpdateAsync(setters => setters.SetProperty(x => x.MealId, 1));
        try
        {
            await using var connection = new NpgsqlConnection(db.Database.GetConnectionString());
            await connection.OpenAsync();
            await using var command = new NpgsqlCommand(Resource("PortionSeed.sql"), connection);
            var exception = await Assert.ThrowsAsync<PostgresException>(() => command.ExecuteNonQueryAsync());
            Assert.Equal("P0001", exception.SqlState);
            await using var rollback = new NpgsqlCommand("ROLLBACK", connection);
            await rollback.ExecuteNonQueryAsync();
        }
        finally
        {
            await db.FoodPortions.Where(x => x.Id == original.Id).ExecuteUpdateAsync(setters => setters.SetProperty(x => x.MealId, original.MealId));
        }
    }

    [Theory]
    [InlineData(2147483647, 1, 1, "23503")]
    [InlineData(1, 0, 1, "23514")]
    [InlineData(1, 1, 0, "23514")]
    public async Task DatabaseEnforcesRelationAndPositiveAmounts(int mealId, int amount, int grams, string sqlState)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BiteRoutineDbContext>();
        db.FoodPortions.Add(new FoodPortion { MealId = mealId, Amount = amount, GramWeight = grams, SourceId = Guid.NewGuid().ToString() });
        var exception = await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
        Assert.Equal(sqlState, Assert.IsType<PostgresException>(exception.InnerException).SqlState);
    }

    [Fact]
    public async Task SourceIdentityCannotBeDuplicatedUnderAnotherFood()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BiteRoutineDbContext>();
        var egg = await db.FoodPortions.AsNoTracking().FirstAsync(x => x.SourceFoodId == "171287");
        db.FoodPortions.Add(new FoodPortion { MealId = 1, Amount = 1, GramWeight = 1, Source = egg.Source, SourceId = egg.SourceId });
        var exception = await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
        Assert.Equal("23505", Assert.IsType<PostgresException>(exception.InnerException).SqlState);
    }
}
