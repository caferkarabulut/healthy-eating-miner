'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/lib/api';

interface Meal {
    meal_id: number;
    meal_name: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    meal_type?: string;
    cuisine?: string;
}

interface MealSearchProps {
    onSelectMeal: (meal: Meal) => void;
    selectedMealId?: number | null;
}

export default function MealSearch({ onSelectMeal, selectedMealId }: MealSearchProps) {
    const [search, setSearch] = useState('');
    const [meals, setMeals] = useState<Meal[]>([]);
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    // Filters
    const [maxCalories, setMaxCalories] = useState<number | ''>('');
    const [minProtein, setMinProtein] = useState<number | ''>('');
    const [mealType, setMealType] = useState<string>('');

    const fetchMeals = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (maxCalories) params.append('max_calories', String(maxCalories));
            if (minProtein) params.append('min_protein', String(minProtein));
            if (mealType) params.append('meal_type', mealType);
            params.append('limit', '5000');

            const res = await apiRequest(`/meals?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setMeals(data);
            }
        } catch (err) {
            console.error('Meal fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [search, maxCalories, minProtein, mealType]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchMeals();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchMeals]);

    const handleSelectMeal = (meal: Meal) => {
        onSelectMeal(meal);
        setShowDropdown(false);
        setSearch(meal.meal_name);
    };

    return (
        <div className="space-y-3">
            {/* Search Input */}
            <div className="relative">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="🔍 Yemek ara... (örn: tavuk, salata)"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />

                {/* Dropdown */}
                {showDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {loading ? (
                            <div className="p-3 text-center text-gray-500">Yükleniyor...</div>
                        ) : meals.length === 0 ? (
                            <div className="p-3 text-center text-gray-500">Sonuç bulunamadı</div>
                        ) : (
                            <>
                                {meals.map((meal) => (
                                    <div
                                        key={meal.meal_id}
                                        onClick={() => handleSelectMeal(meal)}
                                        className={`p-3 hover:bg-green-50 cursor-pointer border-b border-gray-100 last:border-0 ${selectedMealId === meal.meal_id ? 'bg-green-100' : ''
                                            }`}
                                    >
                                        <div className="font-medium text-gray-800">{meal.meal_name}</div>
                                        <div className="text-sm text-gray-500 flex gap-3">
                                            <span>🔥 {meal.calories} kcal</span>
                                            <span>💪 {meal.protein_g}g protein</span>
                                            {meal.meal_type && <span>🍽️ {meal.meal_type}</span>}
                                        </div>
                                    </div>
                                ))}</>
                        )}
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                <select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                >
                    <option value="">Tüm Öğünler</option>
                    <option value="Breakfast">Kahvaltı</option>
                    <option value="Lunch">Öğle</option>
                    <option value="Dinner">Akşam</option>
                    <option value="Snack">Atıştırmalık</option>
                </select>

                <input
                    type="number"
                    value={maxCalories}
                    onChange={(e) => setMaxCalories(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Max kalori"
                    className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                />

                <input
                    type="number"
                    value={minProtein}
                    onChange={(e) => setMinProtein(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Min protein"
                    className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                />
            </div>
        </div>
    );
}
