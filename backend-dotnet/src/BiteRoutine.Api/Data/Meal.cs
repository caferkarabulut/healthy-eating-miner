namespace BiteRoutine.Api.Data;

public sealed class Meal
{
    public int MealId { get; set; }
    public required string MealName { get; set; }
    public string? Cuisine { get; set; }
    public string? MealType { get; set; }
    public decimal? CaloriesKcalPer100G { get; set; }
    public decimal? ProteinGPer100G { get; set; }
    public decimal? CarbsGPer100G { get; set; }
    public decimal? FatGPer100G { get; set; }
    public string? NutritionSource { get; set; }
    public string? NutritionSourceId { get; set; }
    public string? NutritionSourceUrl { get; set; }
}
