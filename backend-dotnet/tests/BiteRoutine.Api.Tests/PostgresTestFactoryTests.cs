namespace BiteRoutine.Api.Tests;

public sealed class PostgresTestFactoryTests
{
    [Fact]
    public void Constructor_RejectsDevelopmentDatabaseBeforeConnecting()
    {
        var error = Assert.Throws<InvalidOperationException>(() =>
            new PostgresTestFactory("Host=127.0.0.1;Database=bite_routine;Username=bite_routine"));

        Assert.Contains("bite_routine_test", error.Message);
    }
}
