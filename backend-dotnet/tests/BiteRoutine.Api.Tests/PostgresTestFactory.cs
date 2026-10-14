using BiteRoutine.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace BiteRoutine.Api.Tests;

public sealed class PostgresTestFactory : WebApplicationFactory<Program>
{
    private readonly object _gate = new();
    private readonly string _adminConnection;
    private readonly string _testConnection;
    private readonly string _schema = $"test_{Guid.NewGuid():N}";
    private bool _schemaCreated;
    private bool _seeded;

    public PostgresTestFactory() : this(Environment.GetEnvironmentVariable("BITE_ROUTINE_TEST_CONNECTION")
        ?? throw new InvalidOperationException("BITE_ROUTINE_TEST_CONNECTION is required for database tests."))
    {
    }

    internal PostgresTestFactory(string connection)
    {
        var builder = new NpgsqlConnectionStringBuilder(connection);
        if (!string.Equals(builder.Database, "bite_routine_test", StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Database tests require the dedicated bite_routine_test database.");
        }

        builder.SearchPath = string.Empty;
        _adminConnection = builder.ConnectionString;
        builder.SearchPath = _schema;
        _testConnection = builder.ConnectionString;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((_, configuration) =>
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:BiteRoutine"] = _testConnection
            }));
    }

    public void EnsureSeeded()
    {
        lock (_gate)
        {
            if (_seeded) return;

            using (var connection = new NpgsqlConnection(_adminConnection))
            {
                connection.Open();
                using var command = new NpgsqlCommand($"CREATE SCHEMA \"{_schema}\"", connection);
                command.ExecuteNonQuery();
                _schemaCreated = true;
            }

            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<BiteRoutineDbContext>();
            db.Database.Migrate();

            (int id, string name, string? cuisine, string? type)[] fixtures =
            [
                (1, "Demo Pasta", "Italian", "Dinner"),
                (2, "Demo Rice Bowl", "Asian", "Lunch"),
                (3, "Demo Lentil Soup", "Turkish", "Lunch"),
                (4, "Demo Energy Bar", null, null),
                (5, "Demo Pasta Bowl", "Italian", "Dinner"),
                (6, "Demo Caesar Salad", "Italian", "Lunch"),
                (7, "Demo Grilled Chicken", "American", "Dinner"),
                (8, "Demo Tofu Bowl", "Japanese", "Lunch"),
                (9, "Demo Stir Fry", "Asian", "Dinner"),
                (10, "Demo Steamed Dumplings", "Chinese", "Dinner"),
                (11, "Demo Baked Salmon", "Nordic", "Dinner"),
                (12, "Demo Beef Stew", "Irish", "Dinner"),
                (13, "Demo Chicken Rice", "Asian", "Dinner"),
                (14, "Demo Lentil Curry", "Indian", "Dinner"),
                (15, "Demo Veggie Wrap", "Mexican", "Lunch"),
                (16, "Demo Protein Shake", "American", "Beverage"),
                (17, "Demo Green Smoothie", "American", "Beverage"),
                (18, "Demo Fruit Plate", "Mediterranean", "Snack"),
                (19, "Demo Yogurt Bowl", "Greek", "Breakfast"),
                (20, "Demo Oatmeal", "Scottish", "Breakfast"),
                (21, "Demo Waffle", "Belgian", "Breakfast"),
                (22, "Demo Pancake", "American", "Breakfast"),
                (23, "Demo Toast", "American", "Breakfast"),
                (24, "Demo Omelette", "French", "Breakfast"),
                (25, "Demo Tea", "British", "Beverage")
            ];

            db.Meals.AddRange(fixtures.Select(x => new Meal
            {
                MealId = x.id,
                MealName = x.name,
                Cuisine = x.cuisine,
                MealType = x.type
            }));
            db.SaveChanges();

            _seeded = true;
        }
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (!disposing || !_schemaCreated) return;

        using var connection = new NpgsqlConnection(_adminConnection);
        connection.Open();
        using var command = new NpgsqlCommand($"DROP SCHEMA IF EXISTS \"{_schema}\" CASCADE", connection);
        command.ExecuteNonQuery();
    }
}
