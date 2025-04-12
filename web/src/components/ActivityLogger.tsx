'use client';

import { useState } from 'react';
import { apiRequest } from '@/lib/api';

interface ActivityLoggerProps {
    currentSteps: number;
    currentLevel: string;
    bmr: number;
    tdee: number;
    targetCalories: number;
    onUpdate: () => void;
}

export default function ActivityLogger({
    currentSteps,
    currentLevel,
    bmr,
    tdee,
    targetCalories,
    onUpdate,
}: ActivityLoggerProps) {
    const [steps, setSteps] = useState(currentSteps);
    const [saving, setSaving] = useState(false);

    const getActivityLevel = (s: number) => {
        if (s < 5000) return { level: 'sedentary', label: '🪑 Hareketsiz', multiplier: 1.2 };
        if (s < 8000) return { level: 'light', label: '🚶 Hafif', multiplier: 1.375 };
        if (s < 12000) return { level: 'moderate', label: '🏃 Orta', multiplier: 1.55 };
        return { level: 'active', label: '🔥 Aktif', multiplier: 1.725 };
    };

    const activityInfo = getActivityLevel(steps);
    // Use backend TDEE if available (single source of truth), otherwise estimate for immediate feedback
    const displayTdee = tdee > 0 ? tdee : bmr * activityInfo.multiplier;

    const handleSave = async () => {
        setSaving(true);
        await apiRequest('/profile/activity', {
            method: 'POST',
            body: JSON.stringify({ steps }),
        });
        setSaving(false);
        onUpdate();
    };

    return (
        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">👟 Bugünkü Aktivite</h3>

            <div className="space-y-4">
                {/* Steps Input */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Adım Sayısı
                    </label>
                    <input
                        type="number"
                        value={steps}
                        onChange={(e) => setSteps(Number(e.target.value))}
                        min={0}
                        max={100000}
                        step={500}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500"
                    />
                </div>

                {/* Activity Level */}
                <div className="bg-gray-700/30 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-400">Aktivite Seviyesi</span>
                        <span className="text-2xl font-bold text-white">{activityInfo.label}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 mb-3">
                        {['sedentary', 'light', 'moderate', 'active'].map((level, i) => (
                            <div
                                key={level}
                                className={`h-2 rounded-full ${['sedentary', 'light', 'moderate', 'active'].indexOf(activityInfo.level) >= i
                                    ? 'bg-green-500'
                                    : 'bg-gray-600'
                                    }`}
                            />
                        ))}
                    </div>
                    <p className="text-gray-500 text-xs text-center">
                        Çarpan: ×{activityInfo.multiplier}
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-gray-700/50 rounded-xl p-3">
                        <p className="text-gray-500 text-xs">BMR</p>
                        <p className="text-lg font-bold text-white">{bmr.toFixed(0)}</p>
                    </div>
                    <div className="bg-gray-700/50 rounded-xl p-3">
                        <p className="text-gray-500 text-xs">TDEE</p>
                        <p className="text-lg font-bold text-blue-400">{displayTdee.toFixed(0)}</p>
                    </div>
                    <div className="bg-gray-700/50 rounded-xl p-3">
                        <p className="text-gray-500 text-xs">Hedef</p>
                        <p className="text-lg font-bold text-green-400">{targetCalories}</p>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-indigo-700 transition disabled:opacity-50"
                >
                    {saving ? 'Kaydediliyor...' : '💾 Aktivite Kaydet'}
                </button>
            </div>
        </div>
    );
}
