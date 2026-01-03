'use client';

import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';

interface WeeklySummary {
    week_range: string;
    days_logged: number;
    avg_calorie: number;
    avg_protein: number;
    calorie_target: number;
    protein_target: number;
    consistency_score: number;
    calorie_trend: string;
    protein_trend: string;
    ai_acceptance_rate: number;
    top_warning: string | null;
}

interface WeeklyCoachData {
    praise: string;
    critique: string;
    next_week_goal: string;
    motivation: string;
    weekly_summary: WeeklySummary;
}

export default function WeeklyCoach() {
    const [data, setData] = useState<WeeklyCoachData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchWeeklyCoach();
    }, []);

    const fetchWeeklyCoach = async () => {
        setLoading(true);
        setError('');

        try {
            const res = await apiRequest('/ai/weekly-coach');
            if (res.ok) {
                const result = await res.json();
                setData(result);
            } else {
                setError('Haftalık özet yüklenemedi.');
            }
        } catch {
            setError('Bir hata oluştu.');
        }

        setLoading(false);
    };

    const getTrendIcon = (trend: string) => {
        switch (trend) {
            case 'artıyor': return '📈';
            case 'azalıyor': return '📉';
            case 'düzensiz': return '📊';
            case 'stabil': return '➡️';
            default: return '📊';
        }
    };

    const getConsistencyColor = (score: number) => {
        if (score >= 0.7) return 'text-green-400';
        if (score >= 0.4) return 'text-yellow-400';
        return 'text-red-400';
    };

    if (loading) {
        return (
            <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-2xl p-6 border border-indigo-500/30">
                <h3 className="text-xl font-semibold text-white mb-4">🧠 Haftalık Koç</h3>
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-2xl p-6 border border-indigo-500/30">
                <h3 className="text-xl font-semibold text-white mb-4">🧠 Haftalık Koç</h3>
                <p className="text-red-400">{error}</p>
            </div>
        );
    }

    if (!data) return null;

    const summary = data.weekly_summary;
    const consistencyPct = Math.round(summary.consistency_score * 100);

    return (
        <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-2xl p-6 border border-indigo-500/30">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-white">🧠 Haftalık Koç</h3>
                <span className="text-sm text-indigo-300 bg-indigo-500/20 px-3 py-1 rounded-full">
                    {summary.week_range}
                </span>
            </div>

            {/* Consistency Score Progress Bar */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-300 text-sm">Hedefe Uyum Skoru</span>
                    <span className={`font-bold ${getConsistencyColor(summary.consistency_score)}`}>
                        %{consistencyPct}
                    </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                    <div
                        className={`h-3 rounded-full transition-all duration-500 ${consistencyPct >= 70 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                                consistencyPct >= 40 ? 'bg-gradient-to-r from-yellow-500 to-amber-400' :
                                    'bg-gradient-to-r from-red-500 to-rose-400'
                            }`}
                        style={{ width: `${consistencyPct}%` }}
                    />
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                    <p className="text-gray-400 text-xs">Kayıtlı Gün</p>
                    <p className="text-white font-bold text-lg">{summary.days_logged}/7</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                    <p className="text-gray-400 text-xs">AI Kabul Oranı</p>
                    <p className="text-white font-bold text-lg">%{Math.round(summary.ai_acceptance_rate * 100)}</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                    <p className="text-gray-400 text-xs">Kalori Trendi</p>
                    <p className="text-white font-bold">
                        {getTrendIcon(summary.calorie_trend)} {summary.calorie_trend}
                    </p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                    <p className="text-gray-400 text-xs">Protein Trendi</p>
                    <p className="text-white font-bold">
                        {getTrendIcon(summary.protein_trend)} {summary.protein_trend}
                    </p>
                </div>
            </div>

            {/* AI Coach Commentary */}
            <div className="space-y-4">
                {/* Praise */}
                <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
                    <h4 className="text-green-400 font-medium mb-1 flex items-center gap-2">
                        <span>✨</span> İyi Yaptın
                    </h4>
                    <p className="text-gray-200 text-sm">{data.praise}</p>
                </div>

                {/* Critique */}
                <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/30">
                    <h4 className="text-yellow-400 font-medium mb-1 flex items-center gap-2">
                        <span>💡</span> Gelişim Alanı
                    </h4>
                    <p className="text-gray-200 text-sm">{data.critique}</p>
                </div>

                {/* Next Week Goal */}
                <div className="bg-indigo-500/10 rounded-xl p-4 border border-indigo-500/30">
                    <h4 className="text-indigo-400 font-medium mb-1 flex items-center gap-2">
                        <span>🎯</span> Bu Hafta Odaklan
                    </h4>
                    <p className="text-white font-medium">{data.next_week_goal}</p>
                </div>

                {/* Motivation */}
                <div className="text-center py-3 border-t border-gray-700 mt-4">
                    <p className="text-purple-300 italic">"{data.motivation}"</p>
                </div>
            </div>

            {/* Top Warning Badge */}
            {summary.top_warning && (
                <div className="mt-4 flex items-center justify-center">
                    <span className="text-xs text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
                        ⚠️ En sık uyarı: {summary.top_warning}
                    </span>
                </div>
            )}
        </div>
    );
}
