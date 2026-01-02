'use client';

import { useState } from 'react';

interface Meal {
    meal_id: number;
    meal_name: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
}

interface AddMealFormProps {
    meals: Meal[];
    onAdd: (mealId: number, portion: number) => void;
    onFavorite: (mealId: number) => void;
}

export default function AddMealForm({ meals, onAdd, onFavorite }: AddMealFormProps) {
    const [selectedMealId, setSelectedMealId] = useState<number | null>(null);
    const [portion, setPortion] = useState(1);

    const selectedMeal = meals.find((m) => m.meal_id === selectedMealId);

    const handleAdd = () => {
        if (selectedMealId) {
            onAdd(selectedMealId, portion);
            setPortion(1);
        }
    };

    const handleFavorite = () => {
        if (selectedMealId) {
            onFavorite(selectedMealId);
        }
    };

    return (
        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">➕ Öğün Ekle</h3>

            <div className="space-y-4">
                {/* Meal Selector */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Öğün Seç
                    </label>
                    <select
                        value={selectedMealId || ''}
                        onChange={(e) => setSelectedMealId(Number(e.target.value) || null)}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                        <option value="">-- Öğün seçin --</option>
                        {meals.map((meal) => (
                            <option key={meal.meal_id} value={meal.meal_id}>
                                {meal.meal_name} ({meal.calories} kcal)
                            </option>
                        ))}
                    </select>
                </div>

                {/* Portion Input */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Porsiyon
                    </label>
                    <input
                        type="number"
                        value={portion}
                        onChange={(e) => setPortion(Number(e.target.value))}
                        min={0.25}
                        max={5}
                        step={0.25}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                </div>

                {/* Selected Meal Info */}
                {selectedMeal && (
                    <div className="bg-gray-700/30 rounded-xl p-4">
                        <h4 className="text-white font-medium mb-2">📊 Seçilen Öğün Detayı</h4>
                        <p className="text-gray-400 text-sm mb-2">
                            Porsiyon: {portion} için hesaplanmış değerler
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="text-gray-300">💪 Protein: {(selectedMeal.protein_g * portion).toFixed(1)}g</div>
                            <div className="text-gray-300">🍞 Karbonhidrat: {(selectedMeal.carbs_g * portion).toFixed(1)}g</div>
                            <div className="text-gray-300">🧈 Yağ: {(selectedMeal.fat_g * portion).toFixed(1)}g</div>
                            <div className="text-gray-300">🔥 Toplam: {(selectedMeal.calories * portion).toFixed(0)} kcal</div>
                        </div>
                    </div>
                )}

                {/* Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={handleAdd}
                        disabled={!selectedMealId}
                        className="flex-1 py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 transition disabled:opacity-50"
                    >
                        🍽️ Bugün Yedim
                    </button>
                    <button
                        onClick={handleFavorite}
                        disabled={!selectedMealId}
                        className="py-3 px-4 bg-yellow-500/20 text-yellow-400 font-semibold rounded-lg hover:bg-yellow-500/30 transition disabled:opacity-50"
                    >
                        ⭐ Favoriye Ekle
                    </button>
                </div>
            </div>
        </div>
    );
}
