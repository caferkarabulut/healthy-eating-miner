using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using BiteRoutine.Api.Contracts;
using BiteRoutine.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace BiteRoutine.Api.Tests;

public sealed class FavoriteMealsTests : IClassFixture<PostgresTestFactory>
{
    private readonly PostgresTestFactory _factory;
    public FavoriteMealsTests(PostgresTestFactory factory) { _factory = factory; factory.EnsureSeeded(); }

    [Fact]
    public async Task FavoritesArePrivatePagedAndRepeatOperationsAreSafeEvenConcurrently()
    {
        using var owner = await UserAsync();
        using var other = await UserAsync();
        Assert.Empty((await ListAsync(owner)).Items);
        var repeated = await Task.WhenAll(Enumerable.Range(0, 8).Select(_ => owner.PutAsync("/me/favorite-meals/1", null)));
        foreach (var response in repeated) { Assert.Equal(HttpStatusCode.NoContent, response.StatusCode); response.Dispose(); }
        Assert.Equal(1, (await ListAsync(owner)).TotalCount);
        Assert.Empty((await ListAsync(other)).Items);
        using var second = await owner.PutAsync("/me/favorite-meals/2", null);
        Assert.Equal(HttpStatusCode.NoContent, second.StatusCode);
        var firstPage = await owner.GetFromJsonAsync<MealListResponse>("/me/favorite-meals?page=1&pageSize=1");
        var secondPage = await owner.GetFromJsonAsync<MealListResponse>("/me/favorite-meals?page=2&pageSize=1");
        Assert.Equal(1, Assert.Single(firstPage!.Items).MealId);
        Assert.Equal(2, Assert.Single(secondPage!.Items).MealId);
        Assert.Equal(2, firstPage.TotalCount);
        Assert.Equal(2, secondPage.Page);
        Assert.Equal(1, secondPage.PageSize);
        Assert.Empty((await owner.GetFromJsonAsync<MealListResponse>("/me/favorite-meals?page=2147483647&pageSize=100"))!.Items);
        using var foreignDelete = await other.DeleteAsync("/me/favorite-meals/1");
        Assert.Equal(HttpStatusCode.NoContent, foreignDelete.StatusCode);
        Assert.Equal(2, (await ListAsync(owner)).TotalCount);
        using var otherAddsSameFood = await other.PutAsync("/me/favorite-meals/1", null);
        Assert.Equal(HttpStatusCode.NoContent, otherAddsSameFood.StatusCode);
        for (var i = 0; i < 2; i++)
        {
            using var remove = await owner.DeleteAsync("/me/favorite-meals/1");
            Assert.Equal(HttpStatusCode.NoContent, remove.StatusCode);
        }
        Assert.Equal(2, Assert.Single((await ListAsync(owner)).Items).MealId);
        Assert.Equal(1, Assert.Single((await ListAsync(other)).Items).MealId);
        using var missing = await owner.PutAsync("/me/favorite-meals/2147483647", null);
        using var missingDelete = await owner.DeleteAsync("/me/favorite-meals/2147483647");
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, missingDelete.StatusCode);
        using var list = await owner.GetAsync("/me/favorite-meals");
        Assert.True(list.Headers.CacheControl!.NoStore);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BiteRoutineDbContext>();
        var favorite = await db.FavoriteMeals.AsNoTracking().FirstAsync();
        db.FavoriteMeals.Add(new FavoriteMeal { UserId = favorite.UserId, MealId = favorite.MealId });
        var error = await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
        Assert.Equal(PostgresErrorCodes.UniqueViolation, Assert.IsType<PostgresException>(error.InnerException).SqlState);
    }

    [Fact]
    public async Task FavoritesUseLiveCatalogWithoutChangingDiarySnapshotsOrAcceptingBodyIdentity()
    {
        using var owner = await UserAsync();
        using var other = await UserAsync();
        using var create = await owner.PostAsJsonAsync("/me/diary-entries", new { mealId = 3, grams = 150.25, date = "2026-10-15", mealSlot = "lunch" });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var diary = await create.Content.ReadFromJsonAsync<DiaryEntryResponse>();
        using var spoof = await owner.PutAsJsonAsync("/me/favorite-meals/3", new { userId = "another-user" });
        Assert.Equal(HttpStatusCode.NoContent, spoof.StatusCode);
        Assert.Empty((await ListAsync(other)).Items);
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<BiteRoutineDbContext>();
            var meal = await db.Meals.SingleAsync(x => x.MealId == 3);
            meal.MealName = "Changed catalog"; meal.CaloriesKcalPer100G = 123.45m;
            meal.ProteinGPer100G = null; meal.CarbsGPer100G = 0m; meal.FatGPer100G = 2m;
            meal.NutritionSource = "Fixture"; meal.NutritionSourceUrl = "https://example.test/live";
            await db.SaveChangesAsync();
        }
        var live = Assert.Single((await ListAsync(owner)).Items);
        Assert.Equal("Changed catalog", live.MealName);
        Assert.Equal(123.45m, live.Nutrition!.CaloriesKcal);
        Assert.Null(live.Nutrition.ProteinG); Assert.Equal(0m, live.Nutrition.CarbsG);
        using var remove = await owner.DeleteAsync("/me/favorite-meals/3");
        Assert.Equal(diary, Assert.Single((await owner.GetFromJsonAsync<DiaryDayResponse>("/me/diary-entries?date=2026-10-15"))!.Items));
    }

    [Theory]
    [InlineData("0")]
    [InlineData("-1")]
    [InlineData("abc")]
    [InlineData("2147483648")]
    public async Task InvalidMealIdsAreRejected(string id)
    {
        using var client = await UserAsync();
        using var add = await client.PutAsync($"/me/favorite-meals/{id}", null);
        using var remove = await client.DeleteAsync($"/me/favorite-meals/{id}");
        Assert.Equal(HttpStatusCode.BadRequest, add.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, remove.StatusCode);
    }

    [Theory]
    [InlineData("page=0")]
    [InlineData("pageSize=101")]
    [InlineData("page=abc")]
    public async Task InvalidPaginationIsRejected(string query)
    {
        using var client = await UserAsync();
        using var response = await client.GetAsync($"/me/favorite-meals?{query}");
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AnonymousAndCookieWithoutCsrfCannotMutateFavorites()
    {
        using var client = _factory.CreateClient();
        using var list = await client.GetAsync("/me/favorite-meals");
        using var add = await client.PutAsync("/me/favorite-meals/1", null);
        using var remove = await client.DeleteAsync("/me/favorite-meals/1");
        Assert.Equal(HttpStatusCode.Unauthorized, list.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, add.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, remove.StatusCode);
        var email = $"favorite-{Guid.NewGuid():N}@example.test";
        using var register = await client.PostAsJsonAsync("/auth/register", new { email, password = "TestPassword1!" });
        using var loginRequest = new HttpRequestMessage(HttpMethod.Post, "/auth/login?useCookies=true") { Content = JsonContent.Create(new { email, password = "TestPassword1!" }) };
        loginRequest.Headers.Add("X-Bite-Routine-Api-Csrf", await CsrfAsync(client));
        using var login = await client.SendAsync(loginRequest);
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        foreach (var method in new[] { HttpMethod.Put, HttpMethod.Delete })
        {
            using var direct = new HttpRequestMessage(method, "/me/favorite-meals/1");
            using var denied = await client.SendAsync(direct);
            Assert.Equal(HttpStatusCode.Forbidden, denied.StatusCode);
            using var valid = new HttpRequestMessage(method, "/me/favorite-meals/1");
            valid.Headers.Add("X-Bite-Routine-Api-Csrf", await CsrfAsync(client));
            using var success = await client.SendAsync(valid);
            Assert.Equal(HttpStatusCode.NoContent, success.StatusCode);
        }
    }

    private static async Task<MealListResponse> ListAsync(HttpClient client) => (await client.GetFromJsonAsync<MealListResponse>("/me/favorite-meals"))!;
    private async Task<HttpClient> UserAsync()
    {
        var client = _factory.CreateClient();
        var email = $"favorite-{Guid.NewGuid():N}@example.test";
        using var register = await client.PostAsJsonAsync("/auth/register", new { email, password = "TestPassword1!" });
        Assert.Equal(HttpStatusCode.OK, register.StatusCode);
        using var login = await client.PostAsJsonAsync("/auth/login", new { email, password = "TestPassword1!" });
        using var json = JsonDocument.Parse(await login.Content.ReadAsStringAsync());
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", json.RootElement.GetProperty("accessToken").GetString());
        return client;
    }
    private static async Task<string> CsrfAsync(HttpClient client)
    {
        using var response = await client.GetAsync("/auth/antiforgery");
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return json.RootElement.GetProperty("requestToken").GetString()!;
    }
}
