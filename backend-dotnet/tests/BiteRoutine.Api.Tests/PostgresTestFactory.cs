using BiteRoutine.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BiteRoutine.Api.Tests;

public sealed class PostgresTestFactory : WebApplicationFactory<Program>
{
    private readonly object _gate = new();
    private bool _seeded;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        var connection = Environment.GetEnvironmentVariable("BITE_ROUTINE_TEST_CONNECTION")
            ?? throw new InvalidOperationException("BITE_ROUTINE_TEST_CONNECTION is required for database tests.");

        builder.ConfigureAppConfiguration((_, configuration) =>
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:BiteRoutine"] = connection
            }));
    }

    public void EnsureSeeded()
    {
        lock (_gate)
        {
            if (_seeded) return;

            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<BiteRoutineDbContext>();
            db.Database.Migrate();

            if (!db.Meals.Any())
            {
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
            }

            _seeded = true;
        }
    }
}
