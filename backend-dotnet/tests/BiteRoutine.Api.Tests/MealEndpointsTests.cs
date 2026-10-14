using System.Net;
using System.Text.Json;
using BiteRoutine.Api.Data;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;

namespace BiteRoutine.Api.Tests;

public sealed class MealEndpointsTests : IClassFixture<PostgresTestFactory>
{
    private readonly PostgresTestFactory _factory;

    public MealEndpointsTests(PostgresTestFactory factory)
    {
        _factory = factory;
        _factory.EnsureSeeded();
    }

    [Fact]
    public async Task GetMeals_Default_ReturnsOkWithFirstTwentyItemsAndTotalCount25()
    {
        using var client = _factory.CreateClient();

        using var response = await client.GetAsync("/meals");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);

        await using var stream = await response.Content.ReadAsStreamAsync();
        using var json = await JsonDocument.ParseAsync(stream);
        var root = json.RootElement;

        Assert.Equal(1, root.GetProperty("page").GetInt32());
        Assert.Equal(20, root.GetProperty("pageSize").GetInt32());
        Assert.Equal(25, root.GetProperty("totalCount").GetInt32());

        var items = root.GetProperty("items").EnumerateArray().ToList();
        Assert.Equal(20, items.Count);

        var ids = items.Select(x => x.GetProperty("mealId").GetInt32()).ToList();
        Assert.Equal(Enumerable.Range(1, 20), ids);
    }

    [Fact]
    public async Task GetMeals_Page2PageSize2_ReturnsIds3And4WithTotalCount25()
    {
        using var client = _factory.CreateClient();

        using var response = await client.GetAsync("/meals?page=2&pageSize=2");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        await using var stream = await response.Content.ReadAsStreamAsync();
        using var json = await JsonDocument.ParseAsync(stream);
        var root = json.RootElement;

        Assert.Equal(2, root.GetProperty("page").GetInt32());
        Assert.Equal(2, root.GetProperty("pageSize").GetInt32());
        Assert.Equal(25, root.GetProperty("totalCount").GetInt32());

        var items = root.GetProperty("items").EnumerateArray().ToList();
        Assert.Equal(2, items.Count);

        var ids = items.Select(x => x.GetProperty("mealId").GetInt32()).ToList();
        Assert.Equal(new[] { 3, 4 }, ids);
    }

    [Fact]
    public async Task GetMeals_SearchTrimAndCaseInsensitive_ReturnsMatchedItemsAndFilteredTotalCount()
    {
        using var client = _factory.CreateClient();

        using var response = await client.GetAsync("/meals?search=%20%20pAsTa%20%20&pageSize=1");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        await using var stream = await response.Content.ReadAsStreamAsync();
        using var json = await JsonDocument.ParseAsync(stream);
        var root = json.RootElement;

        Assert.Equal(1, root.GetProperty("page").GetInt32());
        Assert.Equal(1, root.GetProperty("pageSize").GetInt32());
        Assert.Equal(2, root.GetProperty("totalCount").GetInt32());

        var items = root.GetProperty("items").EnumerateArray().ToList();
        Assert.Single(items);
        Assert.Equal(1, items[0].GetProperty("mealId").GetInt32());
        Assert.Equal("Demo Pasta", items[0].GetProperty("mealName").GetString());
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task GetMeals_EmptyOrWhitespaceSearch_DoesNotApplyFilter(string search)
    {
        using var client = _factory.CreateClient();

        using var response = await client.GetAsync($"/meals?search={Uri.EscapeDataString(search)}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        await using var stream = await response.Content.ReadAsStreamAsync();
        using var json = await JsonDocument.ParseAsync(stream);
        var root = json.RootElement;

        Assert.Equal(25, root.GetProperty("totalCount").GetInt32());
        Assert.Equal(20, root.GetProperty("items").GetArrayLength());
    }

    [Fact]
    public async Task GetMeals_NonMatchingSearch_ReturnsOkWithEmptyItemsAndZeroTotalCount()
    {
        using var client = _factory.CreateClient();

        using var response = await client.GetAsync("/meals?search=nonexistent_xyz");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        await using var stream = await response.Content.ReadAsStreamAsync();
        using var json = await JsonDocument.ParseAsync(stream);
        var root = json.RootElement;

        Assert.Equal(0, root.GetProperty("totalCount").GetInt32());
        Assert.Equal(0, root.GetProperty("items").GetArrayLength());
    }

    [Theory]
    [InlineData("%")]
    [InlineData("_")]
    public async Task GetMeals_SearchTreatsSqlWildcardsAsLiteralText(string search)
    {
        using var client = _factory.CreateClient();
        using var response = await client.GetAsync($"/meals?search={Uri.EscapeDataString(search)}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(0, json.RootElement.GetProperty("totalCount").GetInt32());
    }

    [Fact]
    public async Task GetMeals_TurkishCasing_FindsDottedAndDotlessI()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BiteRoutineDbContext>();
        var meals = new[]
        {
            new Meal { MealId = 1001, MealName = "İzmir Köfte" },
            new Meal { MealId = 1002, MealName = "Ispanak Yemeği" }
        };
        db.Meals.AddRange(meals);
        await db.SaveChangesAsync();

        try
        {
            using var client = _factory.CreateClient();
            foreach (var (search, expectedId) in new[] { ("izmir", 1001), ("ıspanak", 1002) })
            {
                using var response = await client.GetAsync($"/meals?search={Uri.EscapeDataString(search)}");
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
                using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
                Assert.Equal(1, json.RootElement.GetProperty("totalCount").GetInt32());
                Assert.Equal(expectedId, json.RootElement.GetProperty("items")[0].GetProperty("mealId").GetInt32());
            }
        }
        finally
        {
            db.Meals.RemoveRange(meals);
            await db.SaveChangesAsync();
        }
    }

    [Theory]
    [InlineData("/meals?page=999&pageSize=20", 999, 20)]
    [InlineData("/meals?page=2147483647&pageSize=100", 2147483647, 100)]
    public async Task GetMeals_OutOfRangeAndExtremePage_ReturnsOkWithEmptyItemsAndTotalCount25(
        string url, int expectedPage, int expectedPageSize)
    {
        using var client = _factory.CreateClient();

        using var response = await client.GetAsync(url);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        await using var stream = await response.Content.ReadAsStreamAsync();
        using var json = await JsonDocument.ParseAsync(stream);
        var root = json.RootElement;

        Assert.Equal(expectedPage, root.GetProperty("page").GetInt32());
        Assert.Equal(expectedPageSize, root.GetProperty("pageSize").GetInt32());
        Assert.Equal(25, root.GetProperty("totalCount").GetInt32());
        Assert.Equal(0, root.GetProperty("items").GetArrayLength());
    }

    [Theory]
    [InlineData("/meals?page=0")]
    [InlineData("/meals?page=-1")]
    [InlineData("/meals?pageSize=0")]
    [InlineData("/meals?pageSize=101")]
    [InlineData("/meals?page=abc")]
    [InlineData("/meals?pageSize=xyz")]
    public async Task GetMeals_InvalidParameters_ReturnsBadRequest(string url)
    {
        using var client = _factory.CreateClient();

        using var response = await client.GetAsync(url);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetMealById_ExistingId_ReturnsOkWithCamelCaseAndHandlesNulls()
    {
        using var client = _factory.CreateClient();

        // Test normal item (ID 1)
        using var response1 = await client.GetAsync("/meals/1");
        Assert.Equal(HttpStatusCode.OK, response1.StatusCode);
        Assert.Equal("application/json", response1.Content.Headers.ContentType?.MediaType);

        await using (var stream1 = await response1.Content.ReadAsStreamAsync())
        {
            using var json1 = await JsonDocument.ParseAsync(stream1);
            var root1 = json1.RootElement;
            Assert.Equal(1, root1.GetProperty("mealId").GetInt32());
            Assert.Equal("Demo Pasta", root1.GetProperty("mealName").GetString());
            Assert.Equal("Italian", root1.GetProperty("cuisine").GetString());
            Assert.Equal("Dinner", root1.GetProperty("mealType").GetString());
        }

        // Test item with null fields (ID 4: cuisine=null, mealType=null)
        using var response4 = await client.GetAsync("/meals/4");
        Assert.Equal(HttpStatusCode.OK, response4.StatusCode);

        await using var stream4 = await response4.Content.ReadAsStreamAsync();
        using var json4 = await JsonDocument.ParseAsync(stream4);
        var root4 = json4.RootElement;

        // Check exact camelCase property names without enforcing strict order
        var propNames = root4.EnumerateObject().Select(p => p.Name).ToList();
        Assert.Equal(5, propNames.Count);
        Assert.Contains("mealId", propNames);
        Assert.Contains("mealName", propNames);
        Assert.Contains("cuisine", propNames);
        Assert.Contains("mealType", propNames);
        Assert.Contains("nutrition", propNames);

        Assert.Equal(4, root4.GetProperty("mealId").GetInt32());
        Assert.Equal("Demo Energy Bar", root4.GetProperty("mealName").GetString());
        Assert.Equal(JsonValueKind.Null, root4.GetProperty("cuisine").ValueKind);
        Assert.Equal(JsonValueKind.Null, root4.GetProperty("mealType").ValueKind);
        Assert.Equal(JsonValueKind.Null, root4.GetProperty("nutrition").ValueKind);
    }

    [Fact]
    public async Task GetMealById_WithNutrition_ReturnsPer100GValuesAndSource()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BiteRoutineDbContext>();
        var meal = new Meal
        {
            MealId = 2001,
            MealName = "Mercimek (haşlanmış, tuzsuz)",
            CaloriesKcalPer100G = 116,
            ProteinGPer100G = 9.02m,
            CarbsGPer100G = 20.10m,
            FatGPer100G = 0.38m,
            NutritionSource = "USDA FoodData Central",
            NutritionSourceId = "172421",
            NutritionSourceUrl = "https://fdc.nal.usda.gov/food-details/172421/nutrients"
        };
        db.Meals.Add(meal);
        await db.SaveChangesAsync();

        try
        {
            using var client = _factory.CreateClient();
            using var response = await client.GetAsync("/meals/2001");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var nutrition = json.RootElement.GetProperty("nutrition");
            Assert.Equal(100, nutrition.GetProperty("basisGrams").GetInt32());
            Assert.Equal(116, nutrition.GetProperty("caloriesKcal").GetDecimal());
            Assert.Equal(9.02m, nutrition.GetProperty("proteinG").GetDecimal());
            Assert.Equal(20.10m, nutrition.GetProperty("carbsG").GetDecimal());
            Assert.Equal(0.38m, nutrition.GetProperty("fatG").GetDecimal());
            Assert.Equal("USDA FoodData Central", nutrition.GetProperty("source").GetString());
            Assert.Equal(meal.NutritionSourceUrl, nutrition.GetProperty("sourceUrl").GetString());
            Assert.True(nutrition.GetProperty("approximate").GetBoolean());
        }
        finally
        {
            db.Meals.Remove(meal);
            await db.SaveChangesAsync();
        }
    }

    [Fact]
    public async Task GetMealById_NonExistentPositiveId_ReturnsNotFound()
    {
        using var client = _factory.CreateClient();

        using var response = await client.GetAsync("/meals/999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Theory]
    [InlineData("/meals/0")]
    [InlineData("/meals/-1")]
    [InlineData("/meals/abc")]
    [InlineData("/meals/99999999999999999999")]
    public async Task GetMealById_InvalidId_ReturnsBadRequest(string url)
    {
        using var client = _factory.CreateClient();

        using var response = await client.GetAsync(url);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}

