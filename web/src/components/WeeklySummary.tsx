'use client';

interface WeeklyData {
    date: string;
    calories: number;
    protein: number;
}

interface WeeklySummaryProps {
    data: WeeklyData[];
}

export default function WeeklySummary({ data }: WeeklySummaryProps) {
    if (data.length === 0) {
        return (
            <div className="bg-gray-700/30 rounded-xl p-4 text-center">
                <p className="text-gray-400">Haftalık veri bulunamadı.</p>
            </div>
        );
    }

    const daysWithData = data.filter(d => d.calories > 0);
    const totalCalories = data.reduce((sum, d) => sum + d.calories, 0);
    const avgCalories = daysWithData.length > 0 ? totalCalories / daysWithData.length : 0;
    const maxCalories = Math.max(...data.map(d => d.calories), 1);
    const maxDay = data.reduce((max, d) => (d.calories > max.calories ? d : max), data[0]);
    const avgProtein = daysWithData.length > 0
        ? data.reduce((sum, d) => sum + d.protein, 0) / daysWithData.length
        : 0;

    return (
        <div className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-700/50 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">📊 Haftalık Ortalama</p>
                    <p className="text-2xl font-bold text-white">{avgCalories.toFixed(0)} kcal</p>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">🏆 En Yüksek Gün</p>
                    <p className="text-2xl font-bold text-white">{maxDay.calories.toFixed(0)} kcal</p>
                    <p className="text-gray-500 text-xs">{maxDay.date.slice(5)}</p>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">💪 Ortalama Protein</p>
                    <p className="text-2xl font-bold text-white">{avgProtein.toFixed(1)} g</p>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">📅 Kayıtlı Gün</p>
                    <p className="text-2xl font-bold text-white">{daysWithData.length} / 7</p>
                </div>
            </div>

            {/* Bar Chart */}
            <div className="bg-gray-700/30 rounded-xl p-4">
                <h4 className="text-white font-medium mb-4">Son 7 Gün</h4>
                <div className="flex items-end justify-between gap-1" style={{ height: '140px' }}>
                    {data.map((d, i) => {
                        const heightPercent = maxCalories > 0 ? (d.calories / maxCalories) * 100 : 0;
                        const barHeight = Math.max(heightPercent, d.calories > 0 ? 8 : 2);

                        return (
                            <div key={i} className="flex-1 flex flex-col items-center h-full justify-end">
                                {/* Kalori değeri */}
                                {d.calories > 0 && (
                                    <span className="text-xs text-gray-400 mb-1">{d.calories.toFixed(0)}</span>
                                )}
                                {/* Bar */}
                                <div
                                    className={`w-full rounded-t transition-all duration-300 ${d.calories > 0
                                            ? 'bg-gradient-to-t from-green-600 to-emerald-400'
                                            : 'bg-gray-600'
                                        }`}
                                    style={{
                                        height: `${barHeight}%`,
                                        minHeight: d.calories > 0 ? '10px' : '4px'
                                    }}
                                />
                                {/* Tarih */}
                                <p className="text-gray-500 text-xs mt-2">{d.date.slice(5)}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
