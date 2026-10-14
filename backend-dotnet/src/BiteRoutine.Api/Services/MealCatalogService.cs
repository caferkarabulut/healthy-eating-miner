using BiteRoutine.Api.Contracts;
using BiteRoutine.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace BiteRoutine.Api.Services;

public sealed class MealCatalogService(BiteRoutineDbContext db)
{
    public async Task<MealListResponse> GetMealsAsync(MealCatalogQuery query, CancellationToken cancellationToken)
    {
        IQueryable<Meal> meals = db.Meals.AsNoTracking();
        var search = query.Search?.Trim();

        if (!string.IsNullOrEmpty(search))
        {
            // Escape LIKE wildcards so search remains a literal substring search.
            var escaped = search.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");
            meals = meals.Where(meal => EF.Functions.ILike(meal.MealName, $"%{escaped}%", "\\"));
        }

        var totalCount = await meals.CountAsync(cancellationToken);
        var offset = (long)(query.Page - 1) * query.PageSize;
        if (offset >= totalCount || offset > int.MaxValue)
        {
            return new MealListResponse([], query.Page, query.PageSize, totalCount);
        }

        var items = await meals.OrderBy(meal => meal.MealId)
            .Skip((int)offset)
            .Take(query.PageSize)
            .Select(meal => new MealResponse(meal.MealId, meal.MealName, meal.Cuisine, meal.MealType,
                meal.NutritionSource == null || meal.NutritionSourceUrl == null ? null : new MealNutritionResponse(
                    100, meal.CaloriesKcalPer100G, meal.ProteinGPer100G,
                    meal.CarbsGPer100G, meal.FatGPer100G,
                    meal.NutritionSource, meal.NutritionSourceUrl, true)))
            .ToListAsync(cancellationToken);

        return new MealListResponse(items, query.Page, query.PageSize, totalCount);
    }

    public Task<MealResponse?> GetMealByIdAsync(int mealId, CancellationToken cancellationToken)
    {
        return db.Meals.AsNoTracking()
            .Where(meal => meal.MealId == mealId)
            .Select(meal => new MealResponse(meal.MealId, meal.MealName, meal.Cuisine, meal.MealType,
                meal.NutritionSource == null || meal.NutritionSourceUrl == null ? null : new MealNutritionResponse(
                    100, meal.CaloriesKcalPer100G, meal.ProteinGPer100G,
                    meal.CarbsGPer100G, meal.FatGPer100G,
                    meal.NutritionSource, meal.NutritionSourceUrl, true)))
            .FirstOrDefaultAsync(cancellationToken);
    }
}
