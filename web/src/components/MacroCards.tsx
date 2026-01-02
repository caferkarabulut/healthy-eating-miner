'use client';

interface Macros {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

interface MacroCardsProps {
    macros: Macros;
}

export default function MacroCards({ macros }: MacroCardsProps) {
    const cards = [
        { label: '🔥 Kalori', value: `${macros.calories.toFixed(0)} kcal`, color: 'from-orange-500 to-red-500' },
        { label: '💪 Protein', value: `${macros.protein.toFixed(1)} g`, color: 'from-blue-500 to-purple-500' },
        { label: '🍞 Karbonhidrat', value: `${macros.carbs.toFixed(1)} g`, color: 'from-yellow-500 to-orange-500' },
        { label: '🧈 Yağ', value: `${macros.fat.toFixed(1)} g`, color: 'from-green-500 to-teal-500' },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {cards.map((card) => (
                <div
                    key={card.label}
                    className="bg-gray-700/50 rounded-xl p-4 border border-gray-600"
                >
                    <p className="text-gray-400 text-sm mb-1">{card.label}</p>
                    <p className={`text-2xl font-bold bg-gradient-to-r ${card.color} bg-clip-text text-transparent`}>
                        {card.value}
                    </p>
                </div>
            ))}
        </div>
    );
}
