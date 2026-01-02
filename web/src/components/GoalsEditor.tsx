'use client';

import { useState } from 'react';
import { apiRequest } from '@/lib/api';

interface Goals {
    daily_calorie_target: number;
    daily_protein_target: number;
    goal_type: string;
}

interface GoalsEditorProps {
    goals: Goals;
    onSave: () => void;
}

export default function GoalsEditor({ goals, onSave }: GoalsEditorProps) {
    const [editing, setEditing] = useState(false);
    const [calorieTarget, setCalorieTarget] = useState(goals.daily_calorie_target);
    const [proteinTarget, setProteinTarget] = useState(goals.daily_protein_target);
    const [goalType, setGoalType] = useState(goals.goal_type);
    const [saving, setSaving] = useState(false);

    // Otomatik hesaplama
    const handleGoalTypeChange = (type: string) => {
        setGoalType(type);

        // Hedefe göre otomatik kalori/protein önerisi
        switch (type) {
            case 'kilo_verme':
                setCalorieTarget(1800);
                setProteinTarget(120); // Yüksek protein, kas kaybını önler
                break;
            case 'kilo_alma':
                setCalorieTarget(2500);
                setProteinTarget(150);
                break;
            case 'koruma':
            default:
                setCalorieTarget(2000);
                setProteinTarget(100);
                break;
        }
    };

    const handleSave = async () => {
        setSaving(true);

        await apiRequest('/user/goals', {
            method: 'POST',
            body: JSON.stringify({
                daily_calorie_target: calorieTarget,
                daily_protein_target: proteinTarget,
                goal_type: goalType,
            }),
        });

        setSaving(false);
        setEditing(false);
        onSave();
    };

    const goalLabels: Record<string, string> = {
        'kilo_verme': '⚖️ Kilo Verme',
        'kilo_alma': '💪 Kilo Alma',
        'koruma': '🔄 Koruma',
    };

    if (!editing) {
        return (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-white">🧭 Hedeflerim</h3>
                    <button
                        onClick={() => setEditing(true)}
                        className="px-3 py-1 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition text-sm"
                    >
                        ✏️ Düzenle
                    </button>
                </div>
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
        );
    }

    return (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-green-500/50">
            <h3 className="text-xl font-semibold text-white mb-4">🧭 Hedeflerimi Düzenle</h3>

            <div className="space-y-4">
                {/* Goal Type Selector */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Amacın</label>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { value: 'kilo_verme', label: '⚖️ Kilo Ver', desc: '1800 kcal önerilir' },
                            { value: 'koruma', label: '🔄 Koru', desc: '2000 kcal önerilir' },
                            { value: 'kilo_alma', label: '💪 Kilo Al', desc: '2500 kcal önerilir' },
                        ].map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => handleGoalTypeChange(opt.value)}
                                className={`p-3 rounded-xl border text-center transition ${goalType === opt.value
                                        ? 'border-green-500 bg-green-500/20 text-green-400'
                                        : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'
                                    }`}
                            >
                                <div className="font-medium">{opt.label}</div>
                                <div className="text-xs text-gray-500">{opt.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Calorie Target */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Günlük Kalori Hedefi</label>
                    <input
                        type="number"
                        value={calorieTarget}
                        onChange={(e) => setCalorieTarget(Number(e.target.value))}
                        min={1000}
                        max={5000}
                        step={100}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                </div>

                {/* Protein Target */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Günlük Protein Hedefi (g)</label>
                    <input
                        type="number"
                        value={proteinTarget}
                        onChange={(e) => setProteinTarget(Number(e.target.value))}
                        min={30}
                        max={300}
                        step={10}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                </div>

                {/* Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 transition disabled:opacity-50"
                    >
                        {saving ? 'Kaydediliyor...' : '💾 Kaydet'}
                    </button>
                    <button
                        onClick={() => setEditing(false)}
                        className="py-3 px-4 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
                    >
                        İptal
                    </button>
                </div>
            </div>
        </div>
    );
}
