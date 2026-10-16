using BiteRoutine.Api.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;
namespace BiteRoutine.Api.Tests;

public sealed class FoodPortionMigrationTests
{
    [Fact]
    public async Task UpgradeLeavesExistingMealsUsersFavoritesAndDiaryRowsUntouched()
    {
        var connection = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("BITE_ROUTINE_TEST_CONNECTION"));
        Assert.Equal("bite_routine_test", connection.Database);
        var schema = $"portion_migration_{Guid.NewGuid():N}";
        connection.SearchPath = schema;
        await using var admin = new NpgsqlConnection(connection.ConnectionString);
        await admin.OpenAsync();
        await using (var create = new NpgsqlCommand($"CREATE SCHEMA \"{schema}\"", admin)) await create.ExecuteNonQueryAsync();
        try
        {
            await using var db = new BiteRoutineDbContext(new DbContextOptionsBuilder<BiteRoutineDbContext>().UseNpgsql(connection.ConnectionString).Options);
            await db.GetService<IMigrator>().MigrateAsync("20261015163056_AddFavoriteMeals");
            db.Users.Add(new IdentityUser { Id = "legacy-portion-user", UserName = "legacy-portion" });
            db.Meals.Add(new Meal { MealId = 1, MealName = "Existing food", CaloriesKcalPer100G = 123.45m });
            db.FavoriteMeals.Add(new FavoriteMeal { UserId = "legacy-portion-user", MealId = 1 });
            db.DiaryEntries.Add(new DiaryEntry { UserId = "legacy-portion-user", MealId = 1, MealName = "Snapshot food", Grams = 150.25m,
                Date = new DateOnly(2026, 10, 16), MealSlot = "lunch", CaloriesKcalPer100G = 121.23m, ProteinGPer100G = null, CarbsGPer100G = 0 });
            await db.SaveChangesAsync();
            async Task<string> Snapshot(string table)
            {
                await using var command = new NpgsqlCommand($"SELECT jsonb_agg(to_jsonb(t))::text FROM {table} t", admin);
                return (string)(await command.ExecuteScalarAsync())!;
            }
            var tables = new[] { "meals", "\"AspNetUsers\"", "favorite_meals", "diary_entries" };
            var before = new Dictionary<string, string>();
            foreach (var table in tables) before[table] = await Snapshot(table);
            await db.Database.MigrateAsync();
            foreach (var table in tables) Assert.Equal(before[table], await Snapshot(table));
            Assert.Empty(await db.FoodPortions.ToListAsync());
        }
        finally
        {
            await using var drop = new NpgsqlCommand($"DROP SCHEMA \"{schema}\" CASCADE", admin);
            await drop.ExecuteNonQueryAsync();
        }
    }
}
