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
     'USDA FoodData Central', '171287', 'https://fdc.nal.usda.gov/food-details/171287/nutrients'),
    ('Mercimek (haşlanmış, tuzsuz)', 'Temel gıda', 116, 9.02, 20.10, 0.38,
     'USDA FoodData Central', '172421', 'https://fdc.nal.usda.gov/food-details/172421/nutrients'),
    ('Nohut (haşlanmış, tuzsuz)', 'Temel gıda', 164, 8.86, 27.40, 2.59,
     'USDA FoodData Central', '173757', 'https://fdc.nal.usda.gov/food-details/173757/nutrients'),
    ('Yoğurt (sade, tam yağlı)', 'Temel gıda', 78, 3.82, 5.57, 4.48,
     'USDA FoodData Central', '2259793', 'https://fdc.nal.usda.gov/food-details/2259793/nutrients'),
    ('Fuji elma (çiğ, kabuklu)', 'Temel gıda', 64.70, 0.15, 15.70, 0.16,
     'USDA FoodData Central', '1750340', 'https://fdc.nal.usda.gov/food-details/1750340/nutrients'),
    ('Beyaz pirinç (sade pişmiş)', 'Temel gıda', 129, 2.67, 27.99, 0.28,
     'USDA FoodData Central', '2708408', 'https://fdc.nal.usda.gov/food-details/2708408/nutrients'),
    ('Tavuk göğsü (derisiz, fırınlanmış)', 'Temel gıda', 165, 31.00, 0, 3.57,
     'USDA FoodData Central', '171477', 'https://fdc.nal.usda.gov/food-details/171477/nutrients'),
    ('Domates (çiğ)', 'Temel gıda', 18, 0.88, 3.89, 0.20,
     'USDA FoodData Central', '170457', 'https://fdc.nal.usda.gov/food-details/170457/nutrients')
ON CONFLICT (nutrition_source, nutrition_source_id) DO NOTHING;

COMMIT;
