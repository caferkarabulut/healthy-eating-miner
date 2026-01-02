'use client';

interface Meal {
    meal_id: number;
    meal_name: string;
    calories: number;
    protein_g: number;
}

interface Favorite {
    id: number;
    meal_id: number;
}

interface FavoritesListProps {
    favorites: Favorite[];
    meals: Meal[];
    onEat: (mealId: number) => void;
    onRemove: (mealId: number) => void;
}

export default function FavoritesList({ favorites, meals, onEat, onRemove }: FavoritesListProps) {
    const getMeal = (mealId: number) => meals.find((m) => m.meal_id === mealId);

    if (favorites.length === 0) {
        return (
            <div className="bg-gray-700/30 rounded-xl p-4 text-center">
                <p className="text-gray-400">Henüz favori öğün eklemediniz.</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {favorites.map((fav) => {
                const meal = getMeal(fav.meal_id);
                if (!meal) return null;

                return (
                    <div
                        key={fav.id}
                        className="bg-gray-700/50 rounded-xl p-4 flex justify-between items-center border border-gray-600"
                    >
                        <div className="flex-1">
                            <p className="text-white font-medium">{meal.meal_name}</p>
                            <p className="text-gray-400 text-sm">
                                {meal.calories} kcal | 💪 {meal.protein_g}g protein
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => onEat(fav.meal_id)}
                                className="px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition text-sm"
                            >
                                🔁 Yedim
                            </button>
                            <button
                                onClick={() => onRemove(fav.meal_id)}
                                className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition"
                                title="Favoriden Çıkar"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
