'use client';

interface ProgressBarProps {
    label: string;
    current: number;
    target: number;
    unit?: string;
    icon?: string;
}

export default function ProgressBar({ label, current, target, unit = '', icon = '📊' }: ProgressBarProps) {
    const percentage = target > 0 ? Math.min((current / target) * 100, 150) : 0;
    const displayPct = Math.round(percentage);

    // Renk belirleme
    let barColor = 'bg-green-500';
    let bgColor = 'bg-green-100';

    if (percentage > 120) {
        barColor = 'bg-red-500';
        bgColor = 'bg-red-100';
    } else if (percentage > 100) {
        barColor = 'bg-yellow-500';
        bgColor = 'bg-yellow-100';
    } else if (percentage < 50) {
        barColor = 'bg-blue-400';
        bgColor = 'bg-blue-100';
    }

    return (
        <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">
                    {icon} {label}
                </span>
                <span className="text-sm text-gray-600">
                    {Math.round(current)}{unit} / {target}{unit} ({displayPct}%)
                </span>
            </div>
            <div className={`w-full h-3 ${bgColor} rounded-full overflow-hidden`}>
                <div
                    className={`h-full ${barColor} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>
        </div>
    );
}
