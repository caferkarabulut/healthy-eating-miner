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
    if (!data || (data.protein.before === 0 && data.protein.after === 0)) {
        return (
            <div className="bg-gray-700/30 rounded-xl p-4 text-center">
                <p className="text-gray-400">Gelişim analizi için yeterli veri yok.</p>
                <p className="text-gray-500 text-sm mt-1">En az 3 gün veri gereklidir.</p>
            </div>
        );
    }

    const metrics = [
        {
            title: '💪 Protein Hedef Uyumu',
            description: 'Günlük protein hedefinize yaklaşma oranı',
            academic: 'Protein uyumu = Σ(günlük_protein / hedef_protein) / gün_sayısı',
            before: `%${(data.protein.before * 100).toFixed(0)}`,
            after: `%${(data.protein.after * 100).toFixed(0)}`,
            change: data.protein.change_pct,
            isPositive: data.protein.delta > 0,
        },
        {
            title: '🎯 Kalori Stabilitesi',
            description: 'Hedef kaloriden ortalama sapma (düşük = iyi)',
            academic: 'Sapma = Σ|günlük_kalori - hedef_kalori| / gün_sayısı',
            before: `${data.calorie_stability.before} kcal`,
            after: `${data.calorie_stability.after} kcal`,
            change: data.calorie_stability.improvement > 0
                ? `↓ ${data.calorie_stability.improvement} kcal`
                : `↑ ${Math.abs(data.calorie_stability.improvement)} kcal`,
            isPositive: data.calorie_stability.improvement > 0,
        },
        {
            title: '🤖 AI Öneri Etkisi',
            description: 'AI önerisini kabul ettiğiniz günlerdeki protein uyumu',
            academic: 'Karşılaştırma: AI kabul günleri vs. diğer günler',
            before: `%${(data.ai_effect.other_days_protein * 100).toFixed(0)} (${data.ai_effect.other_count} gün)`,
            after: `%${(data.ai_effect.accepted_days_protein * 100).toFixed(0)} (${data.ai_effect.accepted_count} gün)`,
            change: data.ai_effect.accepted_days_protein > data.ai_effect.other_days_protein
                ? '✅ Etkili'
                : '➖ Nötr',
            isPositive: data.ai_effect.accepted_days_protein > data.ai_effect.other_days_protein,
            beforeLabel: 'Diğer Günler',
            afterLabel: 'AI Kabul Günleri',
        },
    ];

    return (
        <div className="space-y-4">
            {/* Academic Note */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-blue-400 text-sm">
                    📚 <strong>Akademik Not:</strong> Bu metrikler, kullanıcı davranışındaki değişimi AI müdahalesi öncesi ve sonrası karşılaştırarak ölçmektedir.
                </p>
            </div>

            {metrics.map((metric, i) => (
                <div key={i} className="bg-gray-700/50 rounded-xl p-5 border border-gray-600">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h4 className="text-white font-semibold">{metric.title}</h4>
                            <p className="text-gray-400 text-sm">{metric.description}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-lg text-sm font-medium ${metric.isPositive
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                            {metric.change}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-800/50 rounded-lg p-3">
                            <p className="text-gray-500 text-xs">{metric.beforeLabel || 'AI Öncesi'}</p>
                            <p className="text-white text-lg font-bold">{metric.before}</p>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-3">
                            <p className="text-gray-500 text-xs">{metric.afterLabel || 'AI Sonrası'}</p>
                            <p className="text-white text-lg font-bold">{metric.after}</p>
                        </div>
                    </div>

                    {/* Formula */}
                    <p className="text-gray-500 text-xs mt-3 font-mono bg-gray-800/30 px-2 py-1 rounded">
                        📐 {metric.academic}
                    </p>
                </div>
            ))}

            {/* Metadata */}
            {data.metadata && (
                <div className="text-gray-500 text-sm text-center space-y-1">
                    <p>📊 Analiz Dönemi: {data.metadata.ai_start_date} tarihinden itibaren</p>
                    <p>AI Öncesi: {data.metadata.before_days} gün | AI Sonrası: {data.metadata.after_days} gün | Min. gerekli: {data.metadata.min_days_required} gün</p>
                </div>
            )}
        </div>
    );
}
