namespace BiteRoutine.Api.Data;

public sealed class DiaryEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string UserId { get; set; }
    public int MealId { get; set; }
    public DateOnly Date { get; set; }
    public string MealSlot { get; set; } = "other";
    public decimal Grams { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; }
    public required string MealName { get; set; }
    public decimal? CaloriesKcalPer100G { get; set; }
    public decimal? ProteinGPer100G { get; set; }
    public decimal? CarbsGPer100G { get; set; }
    public decimal? FatGPer100G { get; set; }
    public string? Source { get; set; }
    public string? SourceId { get; set; }
    public string? SourceUrl { get; set; }
}
