'use client';

interface StreakCardProps {
    currentStreak: number;
    maxStreak: number;
    message: string;
    status: 'active' | 'warning' | 'broken' | 'new';
}

const statusStyles = {
    active: 'bg-gradient-to-r from-orange-500 to-red-500 text-white',
    warning: 'bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900',
    broken: 'bg-gray-700 text-gray-300',
    new: 'bg-gradient-to-r from-green-400 to-emerald-500 text-white',
};

export default function StreakCard({ currentStreak, maxStreak, message, status }: StreakCardProps) {
    return (
        <div className={`rounded-xl p-4 ${statusStyles[status]}`}>
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-3xl">🔥</span>
                        <span className="text-4xl font-bold">{currentStreak}</span>
                        <span className="text-lg opacity-80">gün</span>
                    </div>
                    <p className="mt-1 text-sm opacity-90">{message}</p>
                </div>
                <div className="text-right">
                    <div className="text-sm opacity-70">En yüksek</div>
                    <div className="text-2xl font-bold">{maxStreak}</div>
                </div>
            </div>
        </div>
    );
}
