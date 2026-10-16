using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Serialization;
using BiteRoutine.Api.Data;

namespace BiteRoutine.Api.Contracts;

public abstract record DiaryAmountRequest : IValidatableObject
{
    private decimal? _grams, _quantity;
    private long? _portionId;
    public decimal? Grams { get => _grams; init => _grams = value ?? throw new JsonException("grams cannot be null."); }
    public long? PortionId { get => _portionId; init => _portionId = value ?? throw new JsonException("portionId cannot be null."); }
    public decimal? Quantity { get => _quantity; init => _quantity = value ?? throw new JsonException("quantity cannot be null."); }
    [Required] public DateOnly? Date { get; init; }
    protected virtual bool AllowAmountOmission => false;
    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if (Grams is null && PortionId is null && Quantity is null && AllowAmountOmission) yield break;
        if (Grams is not null)
        {
            if (PortionId is not null || Quantity is not null || Grams < 0.01m || Grams > 10000m || decimal.Round(Grams.Value, 2) != Grams)
                yield return new ValidationResult("Yalnız geçerli gramaj veya ölçü ve miktar gönderin.", [nameof(Grams)]);
        }
        else if (PortionId is null or <= 0 || Quantity is null or <= 0)
            yield return new ValidationResult("Ölçü ve pozitif miktar birlikte zorunludur.", [nameof(PortionId), nameof(Quantity)]);
    }
}

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
[JsonNumberHandling(JsonNumberHandling.Strict)]
public sealed record CreateDiaryEntryRequest : DiaryAmountRequest
{
    [Range(1, int.MaxValue)] public int MealId { get; init; }
    [Required, AllowedValues("breakfast", "lunch", "dinner", "snack", "other")] public string MealSlot { get; init; } = "other";
}

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
[JsonNumberHandling(JsonNumberHandling.Strict)]
public sealed record UpdateDiaryEntryRequest : DiaryAmountRequest
{
    protected override bool AllowAmountOmission => true;
    private string? _mealSlot;
    public string? MealSlot { get => _mealSlot; init => _mealSlot = value ?? throw new JsonException("mealSlot must be a supported string."); }
}

public sealed record DiaryNutritionResponse(decimal? CaloriesKcal, decimal? ProteinG, decimal? CarbsG, decimal? FatG, bool Approximate);

public sealed record DiaryEntryResponse(Guid Id, int MealId, string MealName, decimal Grams, DateOnly Date,
    string MealSlot, DateTimeOffset CreatedAtUtc, DiaryNutritionResponse Nutrition, string? Source, string? SourceId, string? SourceUrl, DiaryPortionSnapshot? Portion = null)
{
    public static DiaryEntryResponse From(DiaryEntry entry) => new(entry.Id, entry.MealId, entry.MealName,
        entry.Grams, entry.Date, entry.MealSlot, entry.CreatedAtUtc,
        new(entry.CaloriesKcalPer100G * entry.Grams / 100m, entry.ProteinGPer100G * entry.Grams / 100m,
            entry.CarbsGPer100G * entry.Grams / 100m, entry.FatGPer100G * entry.Grams / 100m, true),
        entry.Source, entry.SourceId, entry.SourceUrl, entry.Portion);
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

public sealed record DiaryDayResponse(DateOnly Date, string TimeZone, IReadOnlyList<DiaryEntryResponse> Items, IReadOnlyList<DiaryMealSummaryResponse> MealSummaries, DiarySummaryResponse Summary);

public sealed record DiarySummaryDayResponse(DateOnly Date, DiarySummaryResponse Summary);
public sealed record DiaryHistoryResponse(DateOnly StartDate, DateOnly EndDate, string TimeZone, IReadOnlyList<DiarySummaryDayResponse> Days);

public sealed record DiaryMealSummaryResponse(string MealSlot, DiarySummaryResponse Summary)
{
    public static IReadOnlyList<DiaryMealSummaryResponse> From(IReadOnlyList<DiaryEntryResponse> entries)
    {
        var groups = entries.ToLookup(x => x.MealSlot);
        return new[] { "breakfast", "lunch", "dinner", "snack", "other" }
            .Select(slot => new DiaryMealSummaryResponse(slot, DiarySummaryResponse.From(groups[slot].ToArray())))
            .ToArray();
    }
}
