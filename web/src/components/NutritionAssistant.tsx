'use client';

import { useState } from 'react';
import { apiRequest } from '@/lib/api';

interface Meal {
    meal_id: number;
    meal_name: string;
    calories: number;
    protein_g: number;
}

interface NutritionAssistantProps {
    meals: Meal[];
    favorites: string[];
    weeklyCalories: number[];
    weeklyProtein: number[];
    selectedDate: string;
    onRefresh: () => void;
}

interface AiResponse {
    reply: string;
    suggested_meals: string[];
    interaction_id: number | null;
}

export default function NutritionAssistant({
    meals,
    favorites,
    weeklyCalories,
    weeklyProtein,
    selectedDate,
    onRefresh,
}: NutritionAssistantProps) {
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<AiResponse | null>(null);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        setLoading(true);
        setError('');

        try {
            const res = await apiRequest('/ai/chat', {
                method: 'POST',
                body: JSON.stringify({
                    user_message: message,
                    weekly_calories: weeklyCalories,
                    weekly_protein: weeklyProtein,
                    favorites: favorites,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setResponse(data);
            } else {
                setError('AI servisi şu anda kullanılamıyor.');
            }
        } catch {
            setError('Bir hata oluştu.');
        }

        setLoading(false);
    };

    const handleFavorite = async (mealName: string) => {
        const meal = meals.find((m) => m.meal_name === mealName);
        if (!meal) return;

        await apiRequest(`/favorites?meal_id=${meal.meal_id}`, { method: 'POST' });

        // AI accept bildirimi
        if (response?.interaction_id) {
            await apiRequest('/ai/accept', {
                method: 'POST',
                body: JSON.stringify({
                    ai_interaction_id: response.interaction_id,
                    meal_id: meal.meal_id,
                }),
            });
        }

        onRefresh();
    };

    const handleEat = async (mealName: string) => {
        const meal = meals.find((m) => m.meal_name === mealName);
        if (!meal) return;

        await apiRequest(`/logs?meal_id=${meal.meal_id}&portion=1&log_date=${selectedDate}`, {
            method: 'POST',
        });

        // AI accept bildirimi
        if (response?.interaction_id) {
            await apiRequest('/ai/accept', {
                method: 'POST',
                body: JSON.stringify({
                    ai_interaction_id: response.interaction_id,
                    meal_id: meal.meal_id,
                }),
            });
        }

        onRefresh();
    };

    const getMealInfo = (mealName: string) => meals.find((m) => m.meal_name === mealName);

    return (
        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">🤖 Beslenme Asistanı</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Örn: 60g protein içeren bir öğün öner..."
                        className="flex-1 px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 transition disabled:opacity-50"
                    >
                        {loading ? '...' : '🚀 Sor'}
                    </button>
                </div>
            </form>

            {error && (
                <div className="mt-4 bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {response && (
                <div className="mt-6 space-y-4">
                    {/* AI Reply */}
                    <div className="bg-gray-700/30 rounded-xl p-4">
                        <h4 className="text-white font-medium mb-2">💬 Yanıt</h4>
                        <p className="text-gray-300 whitespace-pre-wrap">{response.reply}</p>
                    </div>

                    {/* Suggested Meals */}
                    {response.suggested_meals.length > 0 && (
                        <div>
                            <h4 className="text-white font-medium mb-2">🍽️ Önerilen Öğünler</h4>
                            <div className="space-y-2">
                                {response.suggested_meals.map((mealName, i) => {
                                    const meal = getMealInfo(mealName);
                                    return (
                                        <div
                                            key={i}
                                            className="bg-gray-700/50 rounded-xl p-4 flex justify-between items-center border border-gray-600"
                                        >
                                            <div>
                                                <p className="text-white font-medium">{mealName}</p>
                                                {meal && (
                                                    <p className="text-gray-400 text-sm">
                                                        {meal.calories} kcal | 💪 {meal.protein_g}g
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleFavorite(mealName)}
                                                    className="px-3 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition text-sm"
                                                >
                                                    ⭐
                                                </button>
                                                <button
                                                    onClick={() => handleEat(mealName)}
                                                    className="px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition text-sm"
                                                >
                                                    🍽️
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
