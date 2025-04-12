'use client';

interface Meal {
    meal_id: number;
    meal_name: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
}

interface Log {
    id: number;
    meal_id: number;
    portion: number;
}

interface DailySummaryProps {
    logs: Log[];
    meals: Meal[];
    onDelete: (logId: number) => void;
}

export default function DailySummary({ logs, meals, onDelete }: DailySummaryProps) {
    const getMeal = (mealId: number) => meals.find((m) => m.meal_id === mealId);

    if (logs.length === 0) {
        return (
            <div className="bg-gray-700/30 rounded-xl p-4 text-center">
                <p className="text-gray-400">Bu gün için kayıt yok.</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {logs.map((log) => {
                const meal = getMeal(log.meal_id);
                if (!meal) return null;

                const cal = meal.calories * log.portion;
                const protein = meal.protein_g * log.portion;
                const carbs = meal.carbs_g * log.portion;
                const fat = meal.fat_g * log.portion;

                return (
                    <div
                        key={log.id}
                        className="bg-gray-700/50 rounded-xl p-4 flex justify-between items-center border border-gray-600 hover:border-gray-500 transition"
                    >
                        <div className="flex-1">
                            <p className="text-white font-medium">{meal.meal_name}</p>
                            <p className="text-gray-400 text-sm">
                                Porsiyon: {log.portion} | {cal.toFixed(0)} kcal | 💪 {protein.toFixed(1)}g | 🍞 {carbs.toFixed(1)}g | 🧈 {fat.toFixed(1)}g
                            </p>
                        </div>
                        <button
                            onClick={() => onDelete(log.id)}
                            className="ml-4 p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition"
                            title="Sil"
                        >
                            🗑️
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
