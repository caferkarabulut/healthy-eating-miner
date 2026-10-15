using BiteRoutine.Api.Services;
using Microsoft.Extensions.Configuration;

namespace BiteRoutine.Api.Tests;

public sealed class LocalDemoCheckTests
{
    [Theory]
    [InlineData(null, 10)]
    [InlineData("invalid", 10)]
    [InlineData("Host=localhost;Database=bite_routine_test", 11)]
    [InlineData("Host=remote.example;Database=bite_routine", 11)]
    [InlineData("Host=localhost;Database=bite_routine;Search Path=another", 11)]
    public async Task PreflightRejectsMissingInvalidAndNonDevelopmentTargetsBeforeConnecting(string? connection, int expected)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            { ["ConnectionStrings:BiteRoutine"] = connection }).Build();
        Assert.Equal(expected, await LocalDemoCheck.RunAsync(configuration));
    }
}
