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

    const totalCalories = data.reduce((sum, d) => sum + d.calories, 0);
    const avgCalories = totalCalories / data.length;
    const maxDay = data.reduce((max, d) => (d.calories > max.calories ? d : max), data[0]);
    const avgProtein = data.reduce((sum, d) => sum + d.protein, 0) / data.length;

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
                    <p className="text-gray-500 text-xs">{maxDay.date}</p>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">💪 Ortalama Protein</p>
                    <p className="text-2xl font-bold text-white">{avgProtein.toFixed(1)} g</p>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">📅 Kayıtlı Gün</p>
                    <p className="text-2xl font-bold text-white">{data.filter(d => d.calories > 0).length} / 7</p>
                </div>
            </div>

            {/* Simple Bar Representation */}
            <div className="bg-gray-700/30 rounded-xl p-4">
                <h4 className="text-white font-medium mb-3">Son 7 Gün</h4>
                <div className="flex items-end gap-2 h-32">
                    {data.map((d, i) => {
                        const height = maxDay.calories > 0 ? (d.calories / maxDay.calories) * 100 : 0;
                        return (
                            <div key={i} className="flex-1 flex flex-col items-center">
                                <div
                                    className="w-full bg-gradient-to-t from-green-500 to-emerald-400 rounded-t"
                                    style={{ height: `${Math.max(height, 5)}%` }}
                                />
                                <p className="text-gray-500 text-xs mt-1">{d.date.slice(5)}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
