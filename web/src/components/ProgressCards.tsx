'use client';

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

interface ProgressCardsProps {
    data: ProgressData | null;
}

export default function ProgressCards({ data }: ProgressCardsProps) {
    if (!data || data.protein.before === 0 && data.protein.after === 0) {
        return (
            <div className="bg-gray-700/30 rounded-xl p-4 text-center">
                <p className="text-gray-400">Gelişim analizi için yeterli veri yok.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Protein Compliance */}
                <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                    <h4 className="text-gray-400 text-sm mb-2">💪 Protein Hedef Uyumu</h4>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-400">AI Öncesi:</span>
                            <span className="text-white font-bold">%{(data.protein.before * 100).toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">AI Sonrası:</span>
                            <span className="text-white font-bold">%{(data.protein.after * 100).toFixed(0)}</span>
                        </div>
                        <div className={`text-center py-2 rounded-lg ${data.protein.delta > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {data.protein.change_pct}
                        </div>
                    </div>
                </div>

                {/* Calorie Stability */}
                <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                    <h4 className="text-gray-400 text-sm mb-2">🎯 Kalori Stabilitesi</h4>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-400">AI Öncesi Sapma:</span>
                            <span className="text-white font-bold">{data.calorie_stability.before} kcal</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">AI Sonrası Sapma:</span>
                            <span className="text-white font-bold">{data.calorie_stability.after} kcal</span>
                        </div>
                        <div className={`text-center py-2 rounded-lg ${data.calorie_stability.improvement > 0 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                            {data.calorie_stability.improvement > 0 ? `↓ ${data.calorie_stability.improvement} kcal daha stabil` : 'Değişim yok'}
                        </div>
                    </div>
                </div>

                {/* AI Effect */}
                <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                    <h4 className="text-gray-400 text-sm mb-2">🤖 AI Öneri Etkisi</h4>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-400">AI Kabul Günleri ({data.ai_effect.accepted_count}):</span>
                            <span className="text-white font-bold">%{(data.ai_effect.accepted_days_protein * 100).toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Diğer Günler ({data.ai_effect.other_count}):</span>
                            <span className="text-white font-bold">%{(data.ai_effect.other_days_protein * 100).toFixed(0)}</span>
                        </div>
                        <div className={`text-center py-2 rounded-lg ${data.ai_effect.accepted_days_protein > data.ai_effect.other_days_protein ? 'bg-green-500/20 text-green-400' : 'bg-gray-600/50 text-gray-400'}`}>
                            {data.ai_effect.accepted_days_protein > data.ai_effect.other_days_protein ? '✅ AI önerileri etkili' : 'Karşılaştırma için veri gerekli'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Metadata */}
            {data.metadata && (
                <p className="text-gray-500 text-sm text-center">
                    📊 AI başlangıç: {data.metadata.ai_start_date} |
                    Öncesi: {data.metadata.before_days} gün |
                    Sonrası: {data.metadata.after_days} gün
                </p>
            )}
        </div>
    );
}
