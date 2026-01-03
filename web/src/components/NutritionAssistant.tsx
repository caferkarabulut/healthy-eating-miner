'use client';

import { useState } from 'react';
import { apiRequest } from '@/lib/api';

interface Meal {
    meal_id: number;
    meal_name: string;
    calories: number;
    protein_g: number;
}

interface MealSuggestion {
    title: string;
    reason: string;
    meal_id: number | null;
}

// FAZ 8.5.4: Structured AI Response
interface StructuredAiResponse {
    summary: string;
    warnings: string[];
    meal_suggestions: MealSuggestion[];
    tips: string[];
    interaction_id: number | null;
}

interface NutritionAssistantProps {
    meals: Meal[];
    selectedDate: string;
    onRefresh: () => void;
}

export default function NutritionAssistant({
    meals,
    selectedDate,
    onRefresh,
}: NutritionAssistantProps) {
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<StructuredAiResponse | null>(null);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        setLoading(true);
        setError('');

        try {
            // FAZ 8.5.4: Simplified request - backend handles all context
            const res = await apiRequest('/ai/chat', {
                method: 'POST',
                body: JSON.stringify({
                    user_message: message,
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

    const handleFavorite = async (suggestion: MealSuggestion) => {
        if (!suggestion.meal_id) return;

        await apiRequest(`/favorites?meal_id=${suggestion.meal_id}`, { method: 'POST' });

        // AI accept bildirimi
        if (response?.interaction_id) {
            await apiRequest('/ai/accept', {
                method: 'POST',
                body: JSON.stringify({
                    ai_interaction_id: response.interaction_id,
                    meal_id: suggestion.meal_id,
                }),
            });
        }

        onRefresh();
    };

    const handleEat = async (suggestion: MealSuggestion) => {
        if (!suggestion.meal_id) return;

        await apiRequest(`/logs?meal_id=${suggestion.meal_id}&portion=1&log_date=${selectedDate}`, {
            method: 'POST',
        });

        // AI accept bildirimi
        if (response?.interaction_id) {
            await apiRequest('/ai/accept', {
                method: 'POST',
                body: JSON.stringify({
                    ai_interaction_id: response.interaction_id,
                    meal_id: suggestion.meal_id,
                }),
            });
        }

        onRefresh();
    };

    const getMealInfo = (mealId: number | null) =>
        mealId ? meals.find((m) => m.meal_id === mealId) : null;

    return (
        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">🤖 Beslenme Asistanı</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Örn: Bugün ne yemeliyim?"
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
                    {/* 🧠 Genel Yorum (Summary) */}
                    <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-4 border border-blue-500/30">
                        <h4 className="text-blue-400 font-medium mb-2 flex items-center gap-2">
                            <span>🧠</span> Genel Yorum
                        </h4>
                        <p className="text-gray-200">{response.summary}</p>
                    </div>

                    {/* ⚠️ Uyarılar (Warnings) */}
                    {response.warnings.length > 0 && (
                        <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/30">
                            <h4 className="text-yellow-400 font-medium mb-2 flex items-center gap-2">
                                <span>⚠️</span> Uyarılar
                            </h4>
                            <ul className="space-y-1">
                                {response.warnings.map((warning, i) => (
                                    <li key={i} className="text-yellow-200/80 flex items-start gap-2">
                                        <span className="text-yellow-500">•</span>
                                        {warning}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* 🍽️ Öneriler (Meal Suggestions) */}
                    {response.meal_suggestions.length > 0 && (
                        <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
                            <h4 className="text-green-400 font-medium mb-3 flex items-center gap-2">
                                <span>🍽️</span> Öneriler
                            </h4>
                            <div className="space-y-2">
                                {response.meal_suggestions.map((suggestion, i) => {
                                    const meal = getMealInfo(suggestion.meal_id);
                                    return (
                                        <div
                                            key={i}
                                            className="bg-gray-700/50 rounded-xl p-4 flex justify-between items-center border border-gray-600"
                                        >
                                            <div className="flex-1">
                                                <p className="text-white font-medium">{suggestion.title}</p>
                                                <p className="text-gray-400 text-sm mt-1">{suggestion.reason}</p>
                                                {meal && (
                                                    <p className="text-green-400 text-sm mt-1">
                                                        🔥 {meal.calories} kcal | 💪 {meal.protein_g}g protein
                                                    </p>
                                                )}
                                            </div>
                                            {suggestion.meal_id && (
                                                <div className="flex gap-2 ml-3">
                                                    <button
                                                        onClick={() => handleFavorite(suggestion)}
                                                        className="px-3 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition text-sm"
                                                        title="Favorilere Ekle"
                                                    >
                                                        ⭐
                                                    </button>
                                                    <button
                                                        onClick={() => handleEat(suggestion)}
                                                        className="px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition text-sm"
                                                        title="Yedim"
                                                    >
                                                        🍽️
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* 💡 İpuçları (Tips) */}
                    {response.tips.length > 0 && (
                        <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/30">
                            <h4 className="text-purple-400 font-medium mb-2 flex items-center gap-2">
                                <span>💡</span> İpuçları
                            </h4>
                            <ul className="space-y-1">
                                {response.tips.map((tip, i) => (
                                    <li key={i} className="text-purple-200/80 flex items-start gap-2">
                                        <span className="text-purple-500">•</span>
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

