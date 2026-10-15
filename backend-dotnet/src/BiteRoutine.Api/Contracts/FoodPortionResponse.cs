using BiteRoutine.Api.Data;
namespace BiteRoutine.Api.Contracts;

public sealed record FoodPortionResponse(long Id, int MealId, string MeasureName, decimal Amount,
    decimal GramWeight, decimal GramsPerUnit, bool Approximate, string Source, string SourceFoodId,
    string SourceId, string SourceDescription, string SourceUrl)
{
    public static FoodPortionResponse From(FoodPortion portion) => new(portion.Id, portion.MealId,
        portion.MeasureName, portion.Amount, portion.GramWeight, portion.GramWeight / portion.Amount,
        true, portion.Source, portion.SourceFoodId, portion.SourceId, portion.SourceDescription, portion.SourceUrl);
}
public sealed record FoodPortionListResponse(int MealId, IReadOnlyList<FoodPortionResponse> Items);
