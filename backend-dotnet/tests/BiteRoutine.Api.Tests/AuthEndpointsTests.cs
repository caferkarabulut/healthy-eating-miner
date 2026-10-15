using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using BiteRoutine.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BiteRoutine.Api.Tests;

public sealed class AuthEndpointsTests : IClassFixture<PostgresTestFactory>
{
    private readonly PostgresTestFactory _factory;

    public AuthEndpointsTests(PostgresTestFactory factory)
    {
        _factory = factory;
        _factory.EnsureSeeded();
    }

    [Fact]
    public async Task Register_PersistsUserWithIdentityPasswordHash()
    {
        using var client = _factory.CreateClient();
        var email = NewEmail();
        const string password = "TestPassword1!";

        using var response = await client.PostAsJsonAsync("/auth/register", new { email, password });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BiteRoutineDbContext>();
        var user = await db.Users.SingleAsync(x => x.NormalizedEmail == email.ToUpperInvariant());
        Assert.Equal(email, user.Email);
        Assert.False(string.IsNullOrWhiteSpace(user.PasswordHash));
        Assert.NotEqual(password, user.PasswordHash);
    }

    [Fact]
    public async Task Register_RejectsWeakPasswordAndDuplicateEmail()
    {
        using var client = _factory.CreateClient();
        var email = NewEmail();

        using var weak = await client.PostAsJsonAsync("/auth/register", new
        {
            email,
            password = "weak"
        });
        Assert.Equal(HttpStatusCode.BadRequest, weak.StatusCode);

        await RegisterAsync(client, email, "TestPassword1!");
        using var duplicate = await client.PostAsJsonAsync("/auth/register", new
        {
            email,
            password = "TestPassword1!"
        });
        Assert.Equal(HttpStatusCode.BadRequest, duplicate.StatusCode);
    }

    [Fact]
    public async Task Login_WithBearerToken_CanReadOwnProfile()
    {
        using var client = _factory.CreateClient();
        var email = NewEmail();
        const string password = "TestPassword1!";
        await RegisterAsync(client, email, password);

        using var login = await client.PostAsJsonAsync("/auth/login", new { email, password });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        using var json = JsonDocument.Parse(await login.Content.ReadAsStringAsync());
        var token = json.RootElement.GetProperty("accessToken").GetString();
        Assert.False(string.IsNullOrWhiteSpace(token));

        using var request = new HttpRequestMessage(HttpMethod.Get, "/me");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        using var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var profile = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(email, profile.RootElement.GetProperty("email").GetString());
        Assert.False(string.IsNullOrWhiteSpace(profile.RootElement.GetProperty("userId").GetString()));
        Assert.False(profile.RootElement.TryGetProperty("passwordHash", out _));
    }

    [Fact]
    public async Task Login_WithIdentityCookie_CanReadOwnProfile()
    {
        using var client = _factory.CreateClient();
        var email = NewEmail();
        const string password = "TestPassword1!";
        await RegisterAsync(client, email, password);

        using var login = await client.PostAsJsonAsync("/auth/login?useCookies=true", new { email, password });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var cookie = Assert.Single(login.Headers.GetValues("Set-Cookie"));
        Assert.Contains("httponly", cookie, StringComparison.OrdinalIgnoreCase);

        using var response = await client.GetAsync("/me");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var profile = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(email, profile.RootElement.GetProperty("email").GetString());
    }

    [Fact]
    public async Task Login_WithWrongPassword_IsUnauthorized()
    {
        using var client = _factory.CreateClient();
        var email = NewEmail();
        await RegisterAsync(client, email, "TestPassword1!");

        using var response = await client.PostAsJsonAsync("/auth/login", new
        {
            email,
            password = "WrongPassword1!"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Logout_EndsCookieSession()
    {
        using var client = _factory.CreateClient();
        var email = NewEmail();
        await RegisterAsync(client, email, "TestPassword1!");

        using var login = await client.PostAsJsonAsync("/auth/login?useCookies=true", new
        {
            email,
            password = "TestPassword1!"
        });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/me")).StatusCode);

        using var logout = await client.PostAsync("/auth/logout", null);
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/me")).StatusCode);
    }

    [Fact]
    public async Task Logout_WithoutCookie_IsUnauthorized()
    {
        using var client = _factory.CreateClient();
        using var response = await client.PostAsync("/auth/logout", null);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_WithoutSession_IsUnauthorized_WhileCatalogStaysPublic()
    {
        using var client = _factory.CreateClient();

        using var me = await client.GetAsync("/me");
        using var meals = await client.GetAsync("/meals");

        Assert.Equal(HttpStatusCode.Unauthorized, me.StatusCode);
        Assert.Equal(HttpStatusCode.OK, meals.StatusCode);
    }

    private static string NewEmail() => $"test-{Guid.NewGuid():N}@example.test";

    private static async Task RegisterAsync(HttpClient client, string email, string password)
    {
        using var response = await client.PostAsJsonAsync("/auth/register", new { email, password });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
