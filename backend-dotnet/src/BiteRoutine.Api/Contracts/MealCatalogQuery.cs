using System.ComponentModel.DataAnnotations;

namespace BiteRoutine.Api.Contracts;

public sealed class MealCatalogQuery
{
    public string? Search { get; set; }

    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 20;
}
