using BiteRoutine.Api.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;

namespace BiteRoutine.Api.Tests;

public sealed class DiaryMealSlotMigrationTests
{
    [Fact]
    public async Task ExistingRowsSurviveUpgradeWithOnlyOtherSlotAdded()
    {
        var connection = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("BITE_ROUTINE_TEST_CONNECTION"));
        Assert.Equal("bite_routine_test", connection.Database);
        var schema = $"migration_{Guid.NewGuid():N}";
        connection.SearchPath = schema;
        await using var admin = new NpgsqlConnection(connection.ConnectionString);
        await admin.OpenAsync();
        await using (var create = new NpgsqlCommand($"CREATE SCHEMA \"{schema}\"", admin)) await create.ExecuteNonQueryAsync();
        try
        {
            await using var db = new BiteRoutineDbContext(new DbContextOptionsBuilder<BiteRoutineDbContext>().UseNpgsql(connection.ConnectionString).Options);
            await db.GetService<IMigrator>().MigrateAsync("20261015103955_AddDiaryEntries");
            db.Users.Add(new IdentityUser { Id = "legacy-owner", UserName = "legacy" });
            db.Meals.Add(new Meal { MealId = 1, MealName = "Catalog" });
            await db.SaveChangesAsync();
            await db.Database.ExecuteSqlRawAsync("""
                INSERT INTO diary_entries (id, user_id, meal_id, date, grams, created_at_utc, meal_name,
                    calories_kcal_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g, source, source_id, source_url)
                VALUES ('00000000-0000-0000-0000-000000000001', 'legacy-owner', 1, '2026-10-15', 150.25,
                    '2026-10-14 21:45:00+00', 'Original food', 123.45, NULL, 0, 2.50, 'Original source', '123', 'https://example.test/original')
                """);
            await using var beforeCommand = new NpgsqlCommand("SELECT to_jsonb(d)::text FROM diary_entries d", admin);
            var before = (string)(await beforeCommand.ExecuteScalarAsync())!;
            await db.Database.MigrateAsync();
            await using var afterCommand = new NpgsqlCommand("SELECT (to_jsonb(d) - 'meal_slot')::text FROM diary_entries d", admin);
            Assert.Equal(before, (string)(await afterCommand.ExecuteScalarAsync())!);
            Assert.Equal("other", (await db.DiaryEntries.SingleAsync()).MealSlot);
            await using var invalid = new NpgsqlCommand("UPDATE diary_entries SET meal_slot = 'invalid'", admin);
            var error = await Assert.ThrowsAsync<PostgresException>(() => invalid.ExecuteNonQueryAsync());
            Assert.Equal(PostgresErrorCodes.CheckViolation, error.SqlState);
        }
        finally
        {
            await using var drop = new NpgsqlCommand($"DROP SCHEMA \"{schema}\" CASCADE", admin);
            await drop.ExecuteNonQueryAsync();
        }
    }
}
