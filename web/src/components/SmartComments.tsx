'use client';

interface Macros {
    calories: number;
    protein: number;
}

interface Goals {
    daily_calorie_target: number;
    daily_protein_target: number;
    goal_type: string;
}

interface WeeklyDay {
    calories: number;
    protein: number;
}

interface SmartCommentsProps {
    todayMacros: Macros;
    weeklyData: WeeklyDay[];
    goals: Goals | null;
}

interface Warning {
    type: 'success' | 'warning' | 'info' | 'error';
    message: string;
    academic?: string;
}

export default function SmartComments({ todayMacros, weeklyData, goals }: SmartCommentsProps) {
    if (!goals) return null;

    const warnings: Warning[] = [];
    const daysWithData = weeklyData.filter(d => d.calories > 0);

    // === RULE 1: Günlük Protein Kontrolü ===
    const proteinRatio = todayMacros.protein / goals.daily_protein_target;
    if (proteinRatio < 0.5 && todayMacros.protein > 0) {
        warnings.push({
            type: 'warning',
            message: `⚠️ Bugün protein hedefinin sadece %${(proteinRatio * 100).toFixed(0)}'indesin.`,
            academic: 'Düşük protein alımı kas kaybına ve metabolizma yavaşlamasına neden olabilir.'
        });
    } else if (proteinRatio >= 0.9 && proteinRatio <= 1.1) {
        warnings.push({
            type: 'success',
            message: `✅ Protein hedefine ulaştın! (%${(proteinRatio * 100).toFixed(0)})`,
        });
    }

    // === RULE 2: Günlük Kalori Kontrolü ===
    const calorieRatio = todayMacros.calories / goals.daily_calorie_target;
    if (calorieRatio > 1.2) {
        warnings.push({
            type: 'error',
            message: `🚨 Kalori hedefini %${((calorieRatio - 1) * 100).toFixed(0)} aştın.`,
            academic: 'Kalori fazlası kilo artışına neden olur. Kilo verme hedefinde bu kritik önem taşır.'
        });
    }

    // === RULE 3: Ardışık Gün Protein Eksikliği ===
    if (daysWithData.length >= 3) {
        const last3Days = daysWithData.slice(-3);
        const lowProteinDays = last3Days.filter(d => d.protein < goals.daily_protein_target * 0.7).length;

        if (lowProteinDays === 3) {
            warnings.push({
                type: 'error',
                message: `🚨 Son 3 gün üst üste protein hedefinizin altındasınız!`,
                academic: 'Ardışık düşük protein alımı uzun vadede kas kaybına yol açar.'
            });
        }
    }

    // === RULE 4: Kalori Dalgalanması ===
    if (daysWithData.length >= 3) {
        const deviations = daysWithData.map(d => Math.abs(d.calories - goals.daily_calorie_target));
        const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;

        if (avgDeviation > goals.daily_calorie_target * 0.3) {
            warnings.push({
                type: 'warning',
                message: `⚠️ Kalori alımında yüksek dalgalanma tespit edildi (ort. sapma: ${avgDeviation.toFixed(0)} kcal)`,
                academic: 'Düzensiz kalori alımı metabolizmayı olumsuz etkiler.'
            });
        }
    }

    // === RULE 5: Hedefe Göre Özel Uyarılar ===
    if (goals.goal_type === 'kilo_verme' && calorieRatio > 1) {
        warnings.push({
            type: 'info',
            message: `🎯 Kilo verme hedefiniz var. Kalori kontrolüne dikkat edin.`,
        });
    } else if (goals.goal_type === 'kilo_alma' && calorieRatio < 0.8 && todayMacros.calories > 0) {
        warnings.push({
            type: 'info',
            message: `🎯 Kilo alma hedefiniz için kalori alımını artırmalısınız.`,
        });
    }

    // === RULE 6: Haftalık Protein Trendi ===
    if (daysWithData.length >= 5) {
        const weeklyProteinAvg = daysWithData.reduce((sum, d) => sum + d.protein, 0) / daysWithData.length;
        const proteinGoalRatio = weeklyProteinAvg / goals.daily_protein_target;

        if (proteinGoalRatio >= 0.9) {
            warnings.push({
                type: 'success',
                message: `✅ Haftalık protein ortalaması hedefe uygun (%${(proteinGoalRatio * 100).toFixed(0)})`,
                academic: 'Tutarlı protein alımı kas yapımı ve toparlanma için kritiktir.'
            });
        }
    }

    // Varsayılan mesaj
    if (warnings.length === 0) {
        warnings.push({
            type: 'success',
            message: `✅ Bugün için durumun iyi görünüyor!`,
        });
    }

    const typeStyles = {
        success: 'bg-green-500/20 border-green-500/50 text-green-400',
        warning: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
        error: 'bg-red-500/20 border-red-500/50 text-red-400',
        info: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
    };

    return (
        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">💡 Akıllı Yorumlar & Uyarılar</h3>
            <div className="space-y-3">
                {warnings.map((warning, i) => (
                    <div
                        key={i}
                        className={`rounded-xl p-4 border ${typeStyles[warning.type]}`}
                    >
                        <p className="font-medium">{warning.message}</p>
                        {warning.academic && (
                            <p className="text-xs text-gray-400 mt-1 italic">📚 {warning.academic}</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
