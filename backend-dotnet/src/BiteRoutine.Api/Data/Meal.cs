namespace BiteRoutine.Api.Data;

public sealed class Meal
{
    public int MealId { get; set; }
    public required string MealName { get; set; }
    public string? Cuisine { get; set; }
    public string? MealType { get; set; }
}
