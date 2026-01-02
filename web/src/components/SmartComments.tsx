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

interface SmartCommentsProps {
    todayMacros: Macros;
    weeklyData: { calories: number; protein: number }[];
    goals: Goals | null;
}

export default function SmartComments({ todayMacros, weeklyData, goals }: SmartCommentsProps) {
    if (!goals) return null;

    const comments: string[] = [];

    // Protein hedef kontrolü
    const proteinRatio = todayMacros.protein / goals.daily_protein_target;
    if (proteinRatio < 0.5) {
        comments.push(`⚠️ Bugün protein hedefinin sadece %${(proteinRatio * 100).toFixed(0)}'inde kalıyorsun.`);
    } else if (proteinRatio >= 0.9 && proteinRatio <= 1.1) {
        comments.push(`✅ Protein hedefine yakınsın! (%${(proteinRatio * 100).toFixed(0)})`);
    } else if (proteinRatio > 1.2) {
        comments.push(`💪 Protein hedefini aştın! (%${(proteinRatio * 100).toFixed(0)})`);
    }

    // Kalori hedef kontrolü
    const calorieRatio = todayMacros.calories / goals.daily_calorie_target;
    if (calorieRatio > 1.2) {
        comments.push(`⚠️ Kalori hedefini %${((calorieRatio - 1) * 100).toFixed(0)} aştın.`);
    } else if (calorieRatio < 0.5 && todayMacros.calories > 0) {
        comments.push(`📊 Henüz günlük kalori hedefinin %${(calorieRatio * 100).toFixed(0)}'indesin.`);
    }

    // Haftalık protein trendine bak
    const weeklyProteinAvg = weeklyData.reduce((sum, d) => sum + d.protein, 0) / Math.max(weeklyData.filter(d => d.protein > 0).length, 1);
    const proteinGoalRatio = weeklyProteinAvg / goals.daily_protein_target;

    if (proteinGoalRatio < 0.7 && weeklyData.filter(d => d.protein > 0).length >= 3) {
        comments.push(`📉 Son günlerde protein ortalaması hedefin altında (%${(proteinGoalRatio * 100).toFixed(0)})`);
    }

    // Amaç bazlı yorum
    if (goals.goal_type === 'kilo_verme' && calorieRatio > 1) {
        comments.push(`🎯 Kilo verme hedefin var, kalori kontrolüne dikkat et.`);
    } else if (goals.goal_type === 'kilo_alma' && calorieRatio < 0.8) {
        comments.push(`🎯 Kilo alma hedefin için kalori alımını artırmalısın.`);
    }

    if (comments.length === 0) {
        comments.push(`✅ Bugün için durumun iyi görünüyor!`);
    }

    return (
        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">💡 Akıllı Yorumlar</h3>
            <div className="space-y-2">
                {comments.map((comment, i) => (
                    <div
                        key={i}
                        className="bg-gray-700/30 rounded-lg p-3 text-gray-300"
                    >
                        {comment}
                    </div>
                ))}
            </div>
        </div>
    );
}
