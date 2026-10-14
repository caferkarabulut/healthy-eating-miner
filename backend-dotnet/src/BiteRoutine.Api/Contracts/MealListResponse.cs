namespace BiteRoutine.Api.Contracts;

public sealed record MealListResponse(
    IReadOnlyList<MealResponse> Items,
    int Page,
    int PageSize,
    int TotalCount
);
