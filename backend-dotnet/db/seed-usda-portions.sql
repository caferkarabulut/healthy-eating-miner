-- Reviewed USDA Food Details portions. Explicit application only; no catalog or diary updates.
BEGIN;
CREATE TEMP TABLE reviewed_portions (food_id text, portion_id text, measure_name text, amount numeric, gram_weight numeric, description text, source_url text) ON COMMIT DROP;
INSERT INTO reviewed_portions VALUES
    ('171287', '88374', 'Büyük adet', '1.0', '50.0', 'large', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=171287'),
    ('171287', '88375', 'Çok büyük adet (extra large)', '1.0', '56.0', 'extra large', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=171287'),
    ('171287', '88376', 'Jumbo adet', '1.0', '63.0', 'jumbo', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=171287'),
    ('171287', '88378', 'Orta adet', '1.0', '44.0', 'medium', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=171287'),
    ('171287', '88379', 'Küçük adet', '1.0', '38.0', 'small', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=171287'),
    ('172421', '90596', 'cup (USDA ölçüsü)', '1.0', '198.0', 'cup', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=172421'),
    ('172421', '90597', 'Yemek kaşığı (USDA tbsp)', '1.0', '12.3', 'tbsp', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=172421'),
    ('173757', '93226', 'cup (USDA ölçüsü)', '1.0', '164.0', 'cup', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=173757'),
    ('2708408', '302892', 'cup, pişmiş (USDA ölçüsü)', '1', '158', '1 cup, cooked', 'https://fdc.nal.usda.gov/food-search?type=Survey%20%28FNDDS%29&query=2708408'),
    ('171477', '88817', 'cup, doğranmış veya küp (USDA ölçüsü)', '1.0', '140.0', 'cup, chopped or diced', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=171477'),
    ('171477', '88819', 'Göğüs, kemiksiz ve derisiz', '0.5', '86.0', 'breast, bone and skin removed', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=171477'),
    ('170457', '86682', 'cup, doğranmış veya dilimli (USDA ölçüsü)', '1.0', '180.0', 'cup, chopped or sliced', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=170457'),
    ('170457', '86685', 'Büyük adet (3 inç çap)', '1.0', '182.0', 'large whole (3" dia)', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=170457'),
    ('170457', '86686', 'Orta adet (2-3/5 inç çap)', '1.0', '123.0', 'medium whole (2-3/5" dia)', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=170457'),
    ('170457', '86687', 'Orta dilim (1/4 inç kalınlık)', '1.0', '20.0', 'slice, medium (1/4" thick)', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=170457'),
    ('170457', '86689', 'Küçük adet (2-2/5 inç çap)', '1.0', '91.0', 'small whole (2-2/5" dia)', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=170457'),
    ('171265', '88314', 'cup (USDA ölçüsü)', '1.0', '244.0', 'cup', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=171265'),
    ('171265', '88316', 'Yemek kaşığı (USDA tbsp)', '1.0', '15.0', 'tbsp', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=171265'),
    ('173420', '92489', 'cup, ufalanmış (USDA ölçüsü)', '1.0', '150.0', 'cup, crumbled', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=173420'),
    ('169705', '85379', 'cup (USDA ölçüsü)', '1.0', '156.0', 'cup', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=169705'),
    ('170287', '86370', 'cup (USDA ölçüsü)', '1.0', '182.0', 'cup', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=170287'),
    ('170287', '86371', 'Yemek kaşığı (USDA tbsp)', '1.0', '8.4', 'tbsp', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=170287'),
    ('172688', '91108', 'Dilim', '1.0', '32.0', 'slice', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=172688'),
    ('168927', '84000', 'cup, spagetti (USDA ölçüsü)', '1.0', '91.0', 'cup spaghetti', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=168927'),
    ('168927', '84003', 'cup, penne (USDA ölçüsü)', '1.0', '95.0', 'cup penne', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=168927'),
    ('175167', '95787', 'Fileto', '0.5', '198.0', 'fillet', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=175167'),
    ('174032', '93666', 'Yassı parça (1/4 lb çiğ etten pişmiş verim)', '1.0', '77.0', 'patty (yield from 1/4 lb raw meat)', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=174032'),
    ('170026', '85917', 'cup, küp doğranmış (USDA ölçüsü)', '0.5', '75.0', 'cup, diced', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=170026'),
    ('170026', '85918', 'Büyük adet (3–4-1/4 inç çap)', '1.0', '369.0', 'Potato large (3" to 4-1/4" dia)', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=170026'),
    ('170026', '85919', 'Orta adet (2-1/4–3-1/4 inç çap)', '1.0', '213.0', 'Potato medium (2-1/4" to 3-1/4" dia)', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=170026'),
    ('170026', '85920', 'Küçük adet (1-3/4–2-1/2 inç çap)', '1.0', '170.0', 'Potato small (1-3/4" to 2-1/2" dia)', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=170026'),
    ('170393', '86559', 'Orta adet', '1.0', '61.0', 'medium', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=170393'),
    ('170393', '86560', 'Küçük adet (5-1/2 inç uzunluk)', '1.0', '50.0', 'small (5-1/2" long)', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=170393'),
    ('168409', '83049', 'cup, dilimli (USDA ölçüsü)', '0.5', '52.0', 'cup slices', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=168409'),
    ('168409', '83050', 'Adet (8-1/4 inç uzunluk)', '1.0', '301.0', 'cucumber (8-1/4")', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=168409'),
    ('170000', '85858', 'Büyük adet', '1.0', '150.0', 'large', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=170000'),
    ('170000', '85860', 'Orta adet (2-1/2 inç çap)', '1.0', '110.0', 'medium (2-1/2" dia)', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=170000'),
    ('170000', '85862', 'Küçük adet', '1.0', '70.0', 'small', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=170000'),
    ('170000', '85864', 'Halka', '10.0', '60.0', 'rings', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=170000'),
    ('170379', '86528', 'cup, doğranmış (USDA ölçüsü)', '1.0', '91.0', 'cup chopped', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=170379'),
    ('168462', '83132', 'cup (USDA ölçüsü)', '1.0', '30.0', 'cup', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=168462'),
    ('168462', '83134', 'Yaprak', '1.0', '10.0', 'leaf', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=168462'),
    ('173944', '93513', 'Çok küçük adet (6 inçten kısa)', '1.0', '81.0', 'extra small (less than 6" long)', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=173944'),
    ('173944', '93514', 'Küçük adet (6–6-7/8 inç uzunluk)', '1.0', '101.0', 'small (6" to 6-7/8" long)', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=173944'),
    ('173944', '93515', 'Orta adet (7–7-7/8 inç uzunluk)', '1.0', '118.0', 'medium (7" to 7-7/8" long)', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=173944'),
    ('173944', '93516', 'Büyük adet (8–8-7/8 inç uzunluk)', '1.0', '136.0', 'large (8" to 8-7/8" long)', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=173944'),
    ('173944', '93517', 'Çok büyük adet (en az 9 inç uzunluk)', '1.0', '152.0', 'extra large (9" or longer)', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=173944'),
    ('169097', '84228', 'Büyük adet (3-1/16 inç çap)', '1.0', '184.0', 'large (3-1/16" dia)', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=169097'),
    ('169097', '84229', 'Küçük adet (2-3/8 inç çap)', '1.0', '96.0', 'small (2-3/8" dia)', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=169097'),
    ('169097', '84230', 'Adet (2-5/8 inç çap)', '1.0', '131.0', 'fruit (2-5/8" dia)', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=169097'),
    ('167762', '81923', 'Çok büyük adet (1-5/8 inç çap)', '1.0', '27.0', 'extra large (1-5/8" dia)', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=167762'),
    ('167762', '81924', 'Büyük adet (1-3/8 inç çap)', '1.0', '18.0', 'large (1-3/8" dia)', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=167762'),
    ('167762', '81925', 'Orta adet (1-1/4 inç çap)', '1.0', '12.0', 'medium (1-1/4" dia)', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=167762'),
    ('167762', '81927', 'Küçük adet (1 inç çap)', '1.0', '7.0', 'small (1" dia)', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=167762'),
    ('171413', '88667', 'Yemek kaşığı (USDA tablespoon)', '1.0', '13.5', 'tablespoon', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=171413'),
    ('171413', '88668', 'cup (USDA ölçüsü)', '1.0', '216.0', 'cup', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=171413'),
    ('171413', '88669', 'Çay kaşığı (USDA tsp)', '1.0', '4.5', 'tsp', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=171413'),
    ('170567', '86868', 'Badem içi, adet', '1.0', '1.2', 'almond', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=170567'),
    ('170187', '86201', 'cup, doğranmış (USDA ölçüsü)', '1.0', '117.0', 'cup, chopped', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=170187'),
    ('170187', '86204', 'cup, kabuksuz (50 yarım; USDA ölçüsü)', '1.0', '100.0', 'cup shelled (50 halves)', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=170187'),
    ('172420', '90594', 'cup (USDA ölçüsü; kuru)', '1.0', '192.0', 'cup', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=172420'),
    ('172420', '90595', 'Yemek kaşığı (USDA tablespoon; kuru)', '1.0', '12.0', 'tablespoon', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=172420'),
    ('175202', '95836', 'cup (USDA ölçüsü; kuru)', '1.0', '202.0', 'cup', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=175202'),
    ('175202', '95837', 'Yemek kaşığı (USDA tbsp; kuru)', '1.0', '12.6', 'tbsp', 'https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=175202');
-- Fail rather than silently attach measurements to a different or incomplete catalog.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM reviewed_portions p LEFT JOIN meals m ON m.nutrition_source = 'USDA FoodData Central' AND m.nutrition_source_id = p.food_id WHERE m.meal_id IS NULL) THEN
    RAISE EXCEPTION 'Apply the reviewed USDA catalog seed before portion seed';
  END IF;
END $$;
INSERT INTO food_portions (meal_id, measure_name, amount, gram_weight, source, source_food_id, source_id, source_description, source_url)
SELECT m.meal_id, p.measure_name, p.amount, p.gram_weight, 'USDA FoodData Central', p.food_id, p.portion_id, p.description, p.source_url
FROM reviewed_portions p JOIN meals m ON m.nutrition_source = 'USDA FoodData Central' AND m.nutrition_source_id = p.food_id
ON CONFLICT (source, source_id) DO UPDATE SET
  measure_name = EXCLUDED.measure_name, amount = EXCLUDED.amount, gram_weight = EXCLUDED.gram_weight,
  source_description = EXCLUDED.source_description, source_url = EXCLUDED.source_url
WHERE food_portions.meal_id = EXCLUDED.meal_id AND food_portions.source_food_id = EXCLUDED.source_food_id;
-- Conflicting source identity is an error, never a reassignment to another food.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM reviewed_portions p JOIN food_portions f ON f.source = 'USDA FoodData Central' AND f.source_id = p.portion_id JOIN meals m ON m.meal_id = f.meal_id
    WHERE f.source_food_id IS DISTINCT FROM p.food_id OR m.nutrition_source_id IS DISTINCT FROM p.food_id OR m.nutrition_source IS DISTINCT FROM 'USDA FoodData Central') THEN
    RAISE EXCEPTION 'Portion source identity belongs to another food';
  END IF;
END $$;
COMMIT;
