using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using BiteRoutine.Api.Data;

namespace BiteRoutine.Api.Contracts;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
[JsonNumberHandling(JsonNumberHandling.Strict)]
public sealed record CreateDiaryEntryRequest(
    [Range(1, int.MaxValue)] int MealId,
    [Range(typeof(decimal), "0.01", "10000", ParseLimitsInInvariantCulture = true)] decimal Grams,
    [Required] DateOnly? Date);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
[JsonNumberHandling(JsonNumberHandling.Strict)]
public sealed record UpdateDiaryEntryRequest(
    [Range(typeof(decimal), "0.01", "10000", ParseLimitsInInvariantCulture = true)] decimal Grams,
    [Required] DateOnly? Date);

public sealed record DiaryNutritionResponse(decimal? CaloriesKcal, decimal? ProteinG, decimal? CarbsG, decimal? FatG, bool Approximate);

public sealed record DiaryEntryResponse(Guid Id, int MealId, string MealName, decimal Grams, DateOnly Date,
    DateTimeOffset CreatedAtUtc, DiaryNutritionResponse Nutrition, string? Source, string? SourceId, string? SourceUrl)
{
    public static DiaryEntryResponse From(DiaryEntry entry) => new(entry.Id, entry.MealId, entry.MealName,
        entry.Grams, entry.Date, entry.CreatedAtUtc,
        new(entry.CaloriesKcalPer100G * entry.Grams / 100m, entry.ProteinGPer100G * entry.Grams / 100m,
            entry.CarbsGPer100G * entry.Grams / 100m, entry.FatGPer100G * entry.Grams / 100m, true),
        entry.Source, entry.SourceId, entry.SourceUrl);
}

public sealed record DiarySummaryResponse(int EntryCount, decimal? CaloriesKcal, decimal? ProteinG, decimal? CarbsG, decimal? FatG)
{
    public static DiarySummaryResponse From(IReadOnlyList<DiaryEntryResponse> entries)
    {
        decimal? Total(Func<DiaryNutritionResponse, decimal?> nutrient)
        {
            decimal total = 0m;
            foreach (var entry in entries)
            {
                var value = nutrient(entry.Nutrition);
                if (value is null) return null;
                total += value.Value;
            }
            return total;
        }

        return new(entries.Count, Total(x => x.CaloriesKcal), Total(x => x.ProteinG), Total(x => x.CarbsG), Total(x => x.FatG));
    }
}

public sealed record DiaryDayResponse(DateOnly Date, string TimeZone, IReadOnlyList<DiaryEntryResponse> Items, DiarySummaryResponse Summary);
