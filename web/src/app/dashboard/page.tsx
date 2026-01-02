'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, logout, apiRequest } from '@/lib/api';
import DatePicker from '@/components/DatePicker';
import MacroCards from '@/components/MacroCards';
import DailySummary from '@/components/DailySummary';
import AddMealForm from '@/components/AddMealForm';
import FavoritesList from '@/components/FavoritesList';

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

interface Favorite {
    id: number;
    meal_id: number;
}

interface UserGoals {
    daily_calorie_target: number;
    daily_protein_target: number;
    goal_type: string;
}

export default function DashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');

    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });

    const [meals, setMeals] = useState<Meal[]>([]);
    const [logs, setLogs] = useState<Log[]>([]);
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [goals, setGoals] = useState<UserGoals | null>(null);

    const fetchData = useCallback(async () => {
        // Fetch meals
        const mealsRes = await apiRequest('/meals');
        if (mealsRes.ok) setMeals(await mealsRes.json());

        // Fetch logs for selected date
        const logsRes = await apiRequest(`/logs?log_date=${selectedDate}`);
        if (logsRes.ok) setLogs(await logsRes.json());

        // Fetch favorites
        const favsRes = await apiRequest('/favorites');
        if (favsRes.ok) setFavorites(await favsRes.json());

        // Fetch goals
        const goalsRes = await apiRequest('/user/goals');
        if (goalsRes.ok) setGoals(await goalsRes.json());

        setLoading(false);
    }, [selectedDate]);

    useEffect(() => {
        if (!isAuthenticated()) {
            router.push('/login');
            return;
        }
        setEmail(localStorage.getItem('email') || '');
        fetchData();
    }, [router, fetchData]);

    // Calculate macros
    const calculateMacros = () => {
        let calories = 0, protein = 0, carbs = 0, fat = 0;

        for (const log of logs) {
            const meal = meals.find(m => m.meal_id === log.meal_id);
            if (meal) {
                calories += meal.calories * log.portion;
                protein += meal.protein_g * log.portion;
                carbs += meal.carbs_g * log.portion;
                fat += meal.fat_g * log.portion;
            }
        }

        return { calories, protein, carbs, fat };
    };

    // Handlers
    const handleAddMeal = async (mealId: number, portion: number) => {
        await apiRequest(`/logs?meal_id=${mealId}&portion=${portion}&log_date=${selectedDate}`, {
            method: 'POST',
        });
        fetchData();
    };

    const handleDeleteLog = async (logId: number) => {
        await apiRequest(`/logs/${logId}`, { method: 'DELETE' });
        fetchData();
    };

    const handleAddFavorite = async (mealId: number) => {
        await apiRequest(`/favorites?meal_id=${mealId}`, { method: 'POST' });
        fetchData();
    };

    const handleRemoveFavorite = async (mealId: number) => {
        await apiRequest(`/favorites/${mealId}`, { method: 'DELETE' });
        fetchData();
    };

    const handleEatFromFavorite = async (mealId: number) => {
        await apiRequest(`/logs?meal_id=${mealId}&portion=1&log_date=${selectedDate}`, {
            method: 'POST',
        });
        fetchData();
    };

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    const goalLabels: Record<string, string> = {
        'kilo_verme': '⚖️ Kilo Verme',
        'kilo_alma': '💪 Kilo Alma',
        'koruma': '🔄 Koruma',
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="text-white text-xl">Yükleniyor...</div>
            </div>
        );
    }

    const macros = calculateMacros();

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            {/* Header */}
            <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-white">🥗 Healthy Eating</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-gray-400 hidden sm:block">{email}</span>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition"
                        >
                            Çıkış
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">

                {/* Date Picker & Title */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-3xl font-bold text-white">📊 Dashboard</h2>
                    <DatePicker selectedDate={selectedDate} onChange={setSelectedDate} />
                </div>

                {/* Goals Card */}
                {goals && (
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
                        <h3 className="text-xl font-semibold text-white mb-4">🧭 Hedeflerim</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gray-700/50 rounded-xl p-4">
                                <p className="text-gray-400 text-sm">Günlük Kalori</p>
                                <p className="text-2xl font-bold text-white">{goals.daily_calorie_target} kcal</p>
                            </div>
                            <div className="bg-gray-700/50 rounded-xl p-4">
                                <p className="text-gray-400 text-sm">Günlük Protein</p>
                                <p className="text-2xl font-bold text-white">{goals.daily_protein_target} g</p>
                            </div>
                            <div className="bg-gray-700/50 rounded-xl p-4">
                                <p className="text-gray-400 text-sm">Amaç</p>
                                <p className="text-2xl font-bold text-white">{goalLabels[goals.goal_type] || goals.goal_type}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Daily Summary */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
                    <h3 className="text-xl font-semibold text-white mb-4">🍽️ Bugün Yediklerim</h3>
                    <DailySummary logs={logs} meals={meals} onDelete={handleDeleteLog} />
                </div>

                {/* Macro Cards */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
                    <h3 className="text-xl font-semibold text-white mb-4">📊 Günlük Toplamlar</h3>
                    <MacroCards macros={macros} />
                </div>

                {/* Add Meal Form */}
                <AddMealForm meals={meals} onAdd={handleAddMeal} onFavorite={handleAddFavorite} />

                {/* Favorites */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
                    <h3 className="text-xl font-semibold text-white mb-4">⭐ Favorilerim</h3>
                    <FavoritesList
                        favorites={favorites}
                        meals={meals}
                        onEat={handleEatFromFavorite}
                        onRemove={handleRemoveFavorite}
                    />
                </div>

            </main>
        </div>
    );
}
