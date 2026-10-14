using BiteRoutine.Api.Contracts;

namespace BiteRoutine.Api.Services;

public sealed class MealCatalogService
{
    // 25 sabit demo kayıt, kaynakta ID azalan sırada tutulur.
    private static readonly IReadOnlyList<MealResponse> DemoMeals = new List<MealResponse>
    {
        new(25, "Demo Tea", "British", "Beverage"),
        new(24, "Demo Omelette", "French", "Breakfast"),
        new(23, "Demo Toast", "American", "Breakfast"),
        new(22, "Demo Pancake", "American", "Breakfast"),
        new(21, "Demo Waffle", "Belgian", "Breakfast"),
        new(20, "Demo Oatmeal", "Scottish", "Breakfast"),
        new(19, "Demo Yogurt Bowl", "Greek", "Breakfast"),
        new(18, "Demo Fruit Plate", "Mediterranean", "Snack"),
        new(17, "Demo Green Smoothie", "American", "Beverage"),
        new(16, "Demo Protein Shake", "American", "Beverage"),
        new(15, "Demo Veggie Wrap", "Mexican", "Lunch"),
        new(14, "Demo Lentil Curry", "Indian", "Dinner"),
        new(13, "Demo Chicken Rice", "Asian", "Dinner"),
        new(12, "Demo Beef Stew", "Irish", "Dinner"),
        new(11, "Demo Baked Salmon", "Nordic", "Dinner"),
        new(10, "Demo Steamed Dumplings", "Chinese", "Dinner"),
        new(9, "Demo Stir Fry", "Asian", "Dinner"),
        new(8, "Demo Tofu Bowl", "Japanese", "Lunch"),
        new(7, "Demo Grilled Chicken", "American", "Dinner"),
        new(6, "Demo Caesar Salad", "Italian", "Lunch"),
        new(5, "Demo Pasta Bowl", "Italian", "Dinner"),
        new(4, "Demo Energy Bar", null, null),
        new(3, "Demo Lentil Soup", "Turkish", "Lunch"),
        new(2, "Demo Rice Bowl", "Asian", "Lunch"),
        new(1, "Demo Pasta", "Italian", "Dinner")
    }.AsReadOnly();

    public MealListResponse GetMeals(MealCatalogQuery query)
    {
        IEnumerable<MealResponse> filtered = DemoMeals;

        var search = query.Search?.Trim();
        if (!string.IsNullOrEmpty(search))
        {
            filtered = filtered.Where(m => m.MealName.Contains(search, StringComparison.OrdinalIgnoreCase));
        }

        // Önce filtrele, totalCount'u hesapla, mealId artan sırala, ardından sayfala.
        var ordered = filtered.OrderBy(m => m.MealId).ToList();
        var totalCount = ordered.Count;

        // Offset hesabı long ile yapılır (büyük geçerli page değerinde int taşması önlenir).
        long offset = (long)(query.Page - 1) * query.PageSize;

        List<MealResponse> items;
        if (offset >= totalCount || offset > int.MaxValue)
        {
            items = new List<MealResponse>();
        }
        else
        {
            items = ordered.Skip((int)offset).Take(query.PageSize).ToList();
        }

        return new MealListResponse(items, query.Page, query.PageSize, totalCount);
    }

    public MealResponse? GetMealById(int mealId)
    {
        return DemoMeals.FirstOrDefault(m => m.MealId == mealId);
    }
}
