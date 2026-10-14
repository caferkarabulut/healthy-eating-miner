-- Small, manually reviewed starter catalog from USDA FoodData Central (CC0).
-- Energy is kcal; protein, carbohydrate and fat are grams, all per 100 g edible food.
-- Values are approximate and preparation-specific. Run only on the local development DB.
BEGIN;

INSERT INTO meals (
    meal_name, meal_type,
    calories_kcal_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g,
    nutrition_source, nutrition_source_id, nutrition_source_url
) VALUES
    ('Yumurta (çiğ)', 'Temel gıda', 143, 12.60, 0.72, 9.51,
     'USDA FoodData Central', '171287', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=171287'),
    ('Mercimek (haşlanmış, tuzsuz)', 'Temel gıda', 116, 9.02, 20.10, 0.38,
     'USDA FoodData Central', '172421', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=172421'),
    ('Nohut (haşlanmış, tuzsuz)', 'Temel gıda', 164, 8.86, 27.40, 2.59,
     'USDA FoodData Central', '173757', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=173757'),
    ('Yoğurt (sade, tam yağlı)', 'Temel gıda', 78, 3.82, 5.57, 4.48,
     'USDA FoodData Central', '2259793', 'https://fdc.nal.usda.gov/food-search?type=Foundation&query=2259793'),
    ('Fuji elma (çiğ, kabuklu)', 'Temel gıda', 64.70, 0.15, 15.70, 0.16,
     'USDA FoodData Central', '1750340', 'https://fdc.nal.usda.gov/food-search?type=Foundation&query=1750340'),
    ('Beyaz pirinç (sade pişmiş)', 'Temel gıda', 129, 2.67, 27.99, 0.28,
     'USDA FoodData Central', '2708408', 'https://fdc.nal.usda.gov/food-search?type=Survey%20(FNDDS)&query=2708408'),
    ('Tavuk göğsü (derisiz, fırınlanmış)', 'Temel gıda', 165, 31.00, 0, 3.57,
     'USDA FoodData Central', '171477', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=171477'),
    ('Domates (çiğ)', 'Temel gıda', 18, 0.88, 3.89, 0.20,
     'USDA FoodData Central', '170457', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=170457')
ON CONFLICT (nutrition_source, nutrition_source_id) DO UPDATE
SET nutrition_source_url = EXCLUDED.nutrition_source_url
WHERE meals.nutrition_source_url IS DISTINCT FROM EXCLUDED.nutrition_source_url;

COMMIT;
