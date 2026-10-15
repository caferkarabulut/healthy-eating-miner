using System.Text.Json;
using BiteRoutine.Api.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace BiteRoutine.Api.Services;

// Local CLI preflight only: never starts a host, migrates, seeds or logs configuration/errors.
public static class LocalDemoCheck
{
    public static async Task<int> RunAsync(IConfiguration configuration)
    {
        NpgsqlConnectionStringBuilder connection;
        try
        {
            var value = configuration.GetConnectionString("BiteRoutine");
            if (string.IsNullOrWhiteSpace(value)) return 10;
            connection = new(value);
        }
        catch { return 10; }
        if (connection.Database != "bite_routine" || connection.Host is not ("localhost" or "127.0.0.1" or "::1")
            || (!string.IsNullOrEmpty(connection.SearchPath) && connection.SearchPath != "public")) return 11;
        connection.Timeout = 3;
        connection.CommandTimeout = 3;
        connection.Options = "-c default_transaction_read_only=on";
        connection.IncludeErrorDetail = false;
        using var cancellation = new CancellationTokenSource(TimeSpan.FromSeconds(15));
        try
        {
            await using var db = new BiteRoutineDbContext(new DbContextOptionsBuilder<BiteRoutineDbContext>()
                .UseNpgsql(connection.ConnectionString).Options);
            await db.Database.OpenConnectionAsync(cancellation.Token);
            var npgsql = (NpgsqlConnection)db.Database.GetDbConnection();
            if (npgsql.PostgreSqlVersion.Major != 17) return 16;
            if ((await db.Database.GetPendingMigrationsAsync(cancellation.Token)).Any()) return 13;
            // Required IDs come from the reviewed source mapping; no copied catalog/secret data.
            var path = Path.Combine(AppContext.BaseDirectory, "../../../../../db/sources/usda-starter-foods.json");
            if (!File.Exists(path)) return 15;
            using var source = JsonDocument.Parse(await File.ReadAllTextAsync(path, cancellation.Token));
            var ids = source.RootElement.GetProperty("foods").EnumerateArray()
                .Select(x => x.GetProperty("fdcId").GetInt32().ToString(System.Globalization.CultureInfo.InvariantCulture)).ToArray();
            await using var command = new NpgsqlCommand("""
                SELECT count(DISTINCT nutrition_source_id) FROM meals
                WHERE nutrition_source = 'USDA FoodData Central' AND nutrition_source_id = ANY(@ids)
                  AND nutrition_source_url IS NOT NULL AND calories_kcal_per_100g IS NOT NULL
                  AND protein_g_per_100g IS NOT NULL AND carbs_g_per_100g IS NOT NULL AND fat_g_per_100g IS NOT NULL
                """, npgsql);
            command.Parameters.AddWithValue("ids", ids);
            return Convert.ToInt64(await command.ExecuteScalarAsync(cancellation.Token)) == ids.Length && ids.Length > 0 ? 0 : 14;
        }
        catch { return 12; }
    }
}
