'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, logout, apiRequest } from '@/lib/api';
import DatePicker from '@/components/DatePicker';
import MacroCards from '@/components/MacroCards';
import DailySummary from '@/components/DailySummary';
import AddMealForm from '@/components/AddMealForm';
import FavoritesList from '@/components/FavoritesList';
import NutritionAssistant from '@/components/NutritionAssistant';
import WeeklySummary from '@/components/WeeklySummary';
import ProgressCards from '@/components/ProgressCards';
import SmartComments from '@/components/SmartComments';
import GoalsEditor from '@/components/GoalsEditor';
import ProfileSetup from '@/components/ProfileSetup';
import ActivityLogger from '@/components/ActivityLogger';
import DailyFeedback from '@/components/DailyFeedback';
import WeeklyCoach from '@/components/WeeklyCoach';
import OnboardingBanner from '@/components/OnboardingBanner';
import LoadingSpinner, { CardSkeleton } from '@/components/LoadingSpinner';
import ErrorBoundary from '@/components/ErrorBoundary';
import ProgressBar from '@/components/ProgressBar';
import WarningCard from '@/components/WarningCard';
import MealSearch from '@/components/MealSearch';
import StreakCard from '@/components/StreakCard';
import MealSuggestions from '@/components/MealSuggestions';

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

interface WeeklyData {
    date: string;
    calories: number;
    protein: number;
}

interface ProgressData {
    protein: {
        before: number;
        after: number;
        delta: number;
        change_pct: string;
    };
    calorie_stability: {
        before: number;
        after: number;
        improvement: number;
    };
    ai_effect: {
        accepted_days_protein: number;
        other_days_protein: number;
        accepted_count: number;
        other_count: number;
    };
    metadata?: {
        ai_start_date: string;
        before_days: number;
        after_days: number;
        min_days_required: number;
    };
}

export default function DashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [showProfileSetup, setShowProfileSetup] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });

    const [meals, setMeals] = useState<Meal[]>([]);
    const [logs, setLogs] = useState<Log[]>([]);
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [goals, setGoals] = useState<UserGoals | null>(null);
    const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
    const [progressData, setProgressData] = useState<ProgressData | null>(null);

    // Profile & Activity stats
    const [profileStats, setProfileStats] = useState<{
        bmr: number;
        tdee: number;
        target_calories: number;
        steps: number;
        activity_level: string;
    } | null>(null);

    // Phase 8.5.3 - Daily Warnings
    const [dailyWarnings, setDailyWarnings] = useState<{ type: 'warning' | 'info' | 'success', message: string }[]>([]);

    // FAZ 10.3 - Daily Progress Tracking
    interface DailyProgress {
        calorie_target: number;
        calorie_consumed: number;
        calorie_pct: number;
        protein_target: number;
        protein_consumed: number;
        protein_pct: number;
        status: string;
        warnings: Array<{ type: 'success' | 'info' | 'warning' | 'danger', icon: string, message: string }>;
    }
    const [dailyProgress, setDailyProgress] = useState<DailyProgress | null>(null);

    // FAZ 10.4 - Streak & Suggestions
    interface StreakData {
        current_streak: number;
        max_streak: number;
        message: string;
        status: 'active' | 'warning' | 'broken' | 'new';
    }
    interface SuggestionsData {
        remaining_calories: number;
        remaining_protein: number;
        suggestions: Array<{ meal_id: number; meal_name: string; calories: number; protein_g: number; meal_type: string | null }>;
    }
    const [streakData, setStreakData] = useState<StreakData | null>(null);
    const [suggestionsData, setSuggestionsData] = useState<SuggestionsData | null>(null);

    const fetchData = useCallback(async () => {
        try {
            // Check profile first
            try {
                const profileRes = await apiRequest('/profile');
                if (profileRes.ok) {
                    const pData = await profileRes.json();
                    setShowProfileSetup(!pData.has_profile);
                }
            } catch {
                // Profile check failed, continue anyway
            }

            // Fetch profile stats (BMR, TDEE, Activity)
            try {
                const statsRes = await apiRequest('/profile/stats');
                if (statsRes.ok) {
                    const statsData = await statsRes.json();
                    if (statsData.has_profile) {
                        setProfileStats({
                            bmr: statsData.calculations.bmr,
                            tdee: statsData.calculations.tdee,
                            target_calories: statsData.calculations.target_calories,
                            steps: statsData.activity.steps,
                            activity_level: statsData.activity.level,
                        });
                    }
                }
            } catch {
                // Stats fetch failed
            }

            // Fetch daily warnings (8.5.3)
            try {
                const warnRes = await apiRequest('/analysis/warnings');
                if (warnRes.ok) {
                    setDailyWarnings(await warnRes.json());
                }
            } catch {
                // Warning fetch failed
            }

            // Fetch meals
            const mealsRes = await apiRequest('/meals?limit=5000');
            const mealsData = mealsRes.ok ? await mealsRes.json() : [];
            setMeals(mealsData);

            // Fetch logs for selected date
            const logsRes = await apiRequest(`/logs?log_date=${selectedDate}`);
            if (logsRes.ok) setLogs(await logsRes.json());

            // Fetch favorites
            const favsRes = await apiRequest('/favorites');
            if (favsRes.ok) setFavorites(await favsRes.json());

            // Fetch goals
            const goalsRes = await apiRequest('/user/goals');
            if (goalsRes.ok) setGoals(await goalsRes.json());

            // FAZ 10.3 - Fetch daily progress
            try {
                const progressDailyRes = await apiRequest(`/progress/daily?target_date=${selectedDate}`);
                if (progressDailyRes.ok) {
                    setDailyProgress(await progressDailyRes.json());
                }
            } catch {
                // Progress fetch failed, continue
            }

            // FAZ 10.4 - Fetch streak
            try {
                const streakRes = await apiRequest('/engagement/streak');
                if (streakRes.ok) {
                    setStreakData(await streakRes.json());
                }
            } catch {
                // Streak fetch failed, continue
            }

            // FAZ 10.4 - Fetch meal suggestions
            try {
                const suggestRes = await apiRequest('/engagement/meal-suggestions');
                if (suggestRes.ok) {
                    setSuggestionsData(await suggestRes.json());
                }
            } catch {
                // Suggestions fetch failed, continue
            }

            // Fetch weekly data (son 7 gün)
            const weekly: WeeklyData[] = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date(selectedDate);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];

                const dayLogsRes = await apiRequest(`/logs?log_date=${dateStr}`);
                const dayLogs = dayLogsRes.ok ? await dayLogsRes.json() : [];

                let dayCal = 0, dayProtein = 0;
                for (const log of dayLogs) {
                    const meal = mealsData.find((m: Meal) => m.meal_id === log.meal_id);
                    if (meal) {
                        dayCal += meal.calories * log.portion;
                        dayProtein += meal.protein_g * log.portion;
                    }
                }

                weekly.push({ date: dateStr, calories: dayCal, protein: dayProtein });
            }
            setWeeklyData(weekly);

            // Fetch progress analysis
            try {
                const progressRes = await apiRequest('/analysis/progress');
                if (progressRes.ok) {
                    const data = await progressRes.json();
                    if (!data.error) setProgressData(data);
                }
            } catch {
                // Progress analysis failed, continue
            }
        } catch (err) {
            console.error('Dashboard fetch error:', err);
        }

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
        // Toast bildirimi göster
        const meal = meals.find(m => m.meal_id === mealId);
        setToast(`✅ ${meal?.meal_name || 'Öğün'} eklendi!`);
        setTimeout(() => setToast(null), 3000);
        fetchData();
    };

    const handleDeleteLog = async (logId: number) => {
        await apiRequest(`/logs/${logId}`, { method: 'DELETE' });
        fetchData();
    };

    const handleAddFavorite = async (mealId: number) => {
        await apiRequest(`/favorites?meal_id=${mealId}`, { method: 'POST' });
        const meal = meals.find(m => m.meal_id === mealId);
        setToast(`⭐ ${meal?.meal_name || 'Öğün'} favorilere eklendi!`);
        setTimeout(() => setToast(null), 3000);
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
        const meal = meals.find(m => m.meal_id === mealId);
        setToast(`✅ ${meal?.meal_name || 'Öğün'} eklendi!`);
        setTimeout(() => setToast(null), 3000);
        fetchData();
    };

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="text-white text-xl">Yükleniyor...</div>
            </div>
        );
    }

    const macros = calculateMacros();
    const favoriteNames = favorites
        .map(f => meals.find(m => m.meal_id === f.meal_id)?.meal_name)
        .filter(Boolean) as string[];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            {/* Toast Notification */}
            {toast && (
                <div className="fixed top-6 right-6 z-50 bg-gradient-to-r from-green-400 to-emerald-500 text-white px-8 py-4 rounded-xl shadow-2xl text-lg font-semibold border-2 border-green-300 animate-bounce">
                    {toast}
                </div>
            )}
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

                {/* Onboarding Banners - FAZ 2 */}
                <div className="space-y-3">
                    {showProfileSetup && (
                        <OnboardingBanner type="profile" />
                    )}
                    {!showProfileSetup && profileStats && profileStats.steps === 0 && (
                        <OnboardingBanner type="activity" />
                    )}
                    {logs.length === 0 && !showProfileSetup && (
                        <OnboardingBanner type="meal" />
                    )}
                </div>

                {/* Profile Setup Modal */}
                {showProfileSetup && (
                    <ProfileSetup
                        isModal={true}
                        onComplete={() => {
                            setShowProfileSetup(false);
                            fetchData();
                        }}
                    />
                )}

                {/* Activity Logger */}
                {profileStats && (
                    <ActivityLogger
                        currentSteps={profileStats.steps}
                        currentLevel={profileStats.activity_level}
                        bmr={profileStats.bmr}
                        tdee={profileStats.tdee}
                        targetCalories={profileStats.target_calories}

                        onUpdate={fetchData}
                    />
                )}

                {/* FAZ 10.4: Streak Card */}
                {streakData && (
                    <StreakCard
                        currentStreak={streakData.current_streak}
                        maxStreak={streakData.max_streak}
                        message={streakData.message}
                        status={streakData.status}
                    />
                )}

                {/* FAZ 10.4: Meal Suggestions */}
                {suggestionsData && (
                    <MealSuggestions
                        remainingCalories={suggestionsData.remaining_calories}
                        remainingProtein={suggestionsData.remaining_protein}
                        suggestions={suggestionsData.suggestions}
                        onAddMeal={(mealId) => handleAddMeal(mealId, 1)}
                    />
                )}


                {/* FAZ 10.3: Günlük İlerleme Çubuğu */}
                {dailyProgress && (
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                        <h3 className="text-lg font-semibold text-white mb-4">🎯 Bugünkü Hedefler</h3>
                        <ProgressBar
                            label="Kalori"
                            current={dailyProgress.calorie_consumed}
                            target={dailyProgress.calorie_target}
                            unit=" kcal"
                            icon="🔥"
                        />
                        <ProgressBar
                            label="Protein"
                            current={dailyProgress.protein_consumed}
                            target={dailyProgress.protein_target}
                            unit="g"
                            icon="💪"
                        />
                        <WarningCard warnings={dailyProgress.warnings} />
                    </div>
                )}

                {/* Phase 8.5.3: Günlük Geri Bildirim */}
                <DailyFeedback warnings={dailyWarnings} />

                {/* Goals Editor */}
                {goals && (
                    <GoalsEditor goals={goals} onSave={fetchData} />
                )}

                {/* Smart Comments */}
                <SmartComments
                    todayMacros={macros}
                    weeklyData={weeklyData}
                    goals={goals}
                />

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
                <div id="meals" className="scroll-mt-20">
                    <AddMealForm meals={meals} onAdd={handleAddMeal} onFavorite={handleAddFavorite} />
                </div>

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

                {/* Weekly Summary */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
                    <h3 className="text-xl font-semibold text-white mb-4">📅 Haftalık Özet</h3>
                    <WeeklySummary data={weeklyData} />
                </div>

                {/* Progress Analysis */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
                    <h3 className="text-xl font-semibold text-white mb-4">📈 Gelişim Analizi</h3>
                    <ProgressCards data={progressData} />
                </div>

                {/* Weekly Coach - FAZ 9 */}
                <WeeklyCoach />

                {/* AI Nutrition Assistant */}
                <NutritionAssistant
                    meals={meals}
                    selectedDate={selectedDate}
                    onRefresh={fetchData}
                />

            </main>
        </div>
    );
}
