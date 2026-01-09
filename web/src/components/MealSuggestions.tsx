'use client';

interface MealSuggestion {
    meal_id: number;
    meal_name: string;
    calories: number;
    protein_g: number;
    meal_type: string | null;
}

interface MealSuggestionsProps {
    remainingCalories: number;
    remainingProtein: number;
    suggestions: MealSuggestion[];
    onAddMeal: (mealId: number) => void;
}

export default function MealSuggestions({
    remainingCalories,
    remainingProtein,
    suggestions,
    onAddMeal
}: MealSuggestionsProps) {
    if (suggestions.length === 0) {
        return (
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-2">🍽️ Bugün Ne Yiyebilirsin?</h3>
                <p className="text-gray-400">Hedefe ulaştın veya uygun öneri bulunamadı.</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-2">🍽️ Bugün Ne Yiyebilirsin?</h3>
            <p className="text-sm text-gray-400 mb-4">
                Kalan: <span className="text-green-400">{Math.round(remainingCalories)} kcal</span> |
                <span className="text-blue-400"> {Math.round(remainingProtein)}g protein</span>
            </p>

            <div className="space-y-2">
                {suggestions.map((meal) => (
                    <div
                        key={meal.meal_id}
                        className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition"
                    >
                        <div>
                            <div className="font-medium text-white">{meal.meal_name}</div>
                            <div className="text-sm text-gray-400">
                                🔥 {meal.calories} kcal | 💪 {meal.protein_g}g protein
                            </div>
                        </div>
                        <button
                            onClick={() => onAddMeal(meal.meal_id)}
                            className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition"
                        >
                            + Ekle
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
