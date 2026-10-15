namespace BiteRoutine.Api.Data;

public sealed class FoodPortion
{
    public long Id { get; set; }
    public int MealId { get; set; }
    public string MeasureName { get; set; } = "";
    public decimal Amount { get; set; }
    public decimal GramWeight { get; set; }
    public string Source { get; set; } = "";
    public string SourceFoodId { get; set; } = "";
    public string SourceId { get; set; } = "";
    public string SourceDescription { get; set; } = "";
    public string SourceUrl { get; set; } = "";
}
