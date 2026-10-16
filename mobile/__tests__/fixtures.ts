import type { Meal } from "../src/api/catalog";
export const egg: Meal = { mealId: 1, mealName: "Yumurta (çiğ)", cuisine: null, mealType: "Temel gıda", nutrition: {
  basisGrams: 100, caloriesKcal: 143, proteinG: 12.56, carbsG: 0, fatG: null, source: "USDA FoodData Central", sourceUrl: "https://fdc.nal.usda.gov/food-search?query=171287", approximate: true } };
export const response = (value: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => value }) as Response;
export const page = (items = [egg], current = 1, totalCount = 30) => ({ items, page: current, pageSize: 10, totalCount });
