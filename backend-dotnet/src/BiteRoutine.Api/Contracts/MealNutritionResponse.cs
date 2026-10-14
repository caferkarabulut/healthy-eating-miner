namespace BiteRoutine.Api.Contracts;

public sealed record MealNutritionResponse(
    int BasisGrams,
    decimal? CaloriesKcal,
    decimal? ProteinG,
    decimal? CarbsG,
    decimal? FatG,
    string Source,
    string SourceUrl,
    bool Approximate
);
