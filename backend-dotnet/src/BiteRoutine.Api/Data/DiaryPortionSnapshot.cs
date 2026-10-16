namespace BiteRoutine.Api.Data;

// An immutable consumption-time copy; deliberately has no FK to the live measure.
public sealed record DiaryPortionSnapshot
{
    public long PortionId { get; init; }
    public decimal Quantity { get; init; }
    public string MeasureName { get; init; } = "";
    public decimal SourceAmount { get; init; }
    public decimal SourceGramWeight { get; init; }
    public string Source { get; init; } = "";
    public string SourceFoodId { get; init; } = "";
    public string SourceId { get; init; } = "";
    public string SourceDescription { get; init; } = "";
    public string SourceUrl { get; init; } = "";
}
