using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Serialization;
using BiteRoutine.Api.Data;

namespace BiteRoutine.Api.Contracts;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
[JsonNumberHandling(JsonNumberHandling.Strict)]
public sealed record CreateDiaryEntryRequest(
    [Range(1, int.MaxValue)] int MealId,
    [Range(typeof(decimal), "0.01", "10000", ParseLimitsInInvariantCulture = true)] decimal Grams,
    [Required] DateOnly? Date,
    [Required, AllowedValues("breakfast", "lunch", "dinner", "snack", "other")] string MealSlot = "other");

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
[JsonNumberHandling(JsonNumberHandling.Strict)]
public sealed record UpdateDiaryEntryRequest(
    [Range(typeof(decimal), "0.01", "10000", ParseLimitsInInvariantCulture = true)] decimal Grams,
    [Required] DateOnly? Date)
{
    private string? _mealSlot;

    // Omission preserves the current slot; explicit JSON null is invalid.
    public string? MealSlot
    {
        get => _mealSlot;
        init => _mealSlot = value ?? throw new JsonException("mealSlot must be a supported string.");
    }
}

public sealed record DiaryNutritionResponse(decimal? CaloriesKcal, decimal? ProteinG, decimal? CarbsG, decimal? FatG, bool Approximate);

public sealed record DiaryEntryResponse(Guid Id, int MealId, string MealName, decimal Grams, DateOnly Date,
    string MealSlot, DateTimeOffset CreatedAtUtc, DiaryNutritionResponse Nutrition, string? Source, string? SourceId, string? SourceUrl)
{
    public static DiaryEntryResponse From(DiaryEntry entry) => new(entry.Id, entry.MealId, entry.MealName,
        entry.Grams, entry.Date, entry.MealSlot, entry.CreatedAtUtc,
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

public sealed record DiarySummaryDayResponse(DateOnly Date, DiarySummaryResponse Summary);
public sealed record DiaryHistoryResponse(DateOnly StartDate, DateOnly EndDate, string TimeZone, IReadOnlyList<DiarySummaryDayResponse> Days);
