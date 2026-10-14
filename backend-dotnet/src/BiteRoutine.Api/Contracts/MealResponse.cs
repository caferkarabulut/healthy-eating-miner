namespace BiteRoutine.Api.Contracts;

public sealed record MealResponse(
    int MealId,
    string MealName,
    string? Cuisine,
    string? MealType,
    MealNutritionResponse? Nutrition
);
