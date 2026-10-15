namespace BiteRoutine.Api.Data;

public sealed class FavoriteMeal
{
    public required string UserId { get; set; }
    public int MealId { get; set; }
}
