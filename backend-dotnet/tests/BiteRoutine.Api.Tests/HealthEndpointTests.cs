using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace BiteRoutine.Api.Tests;

public sealed class HealthEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public HealthEndpointTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetLive_ReturnsOkWithServiceStatusJson()
    {
        using var client = _factory.CreateClient();

        using var response = await client.GetAsync("/health/live");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);

        await using var body = await response.Content.ReadAsStreamAsync();
        using var json = await JsonDocument.ParseAsync(body);
        var root = json.RootElement;

        Assert.Equal(JsonValueKind.Object, root.ValueKind);

        // Exactly two case-sensitive camelCase properties, "status" and "service"; order does not matter.
        var propertyNames = root.EnumerateObject().Select(p => p.Name).ToArray();
        Assert.Equal(2, propertyNames.Length);
        Assert.Contains("status", propertyNames);
        Assert.Contains("service", propertyNames);

        Assert.Equal("ok", root.GetProperty("status").GetString());
        Assert.Equal("Bite Routine", root.GetProperty("service").GetString());
    }
}
