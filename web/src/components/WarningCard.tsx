'use client';

interface WarningCardProps {
    warnings: Array<{
        type: 'success' | 'info' | 'warning' | 'danger';
        icon: string;
        message: string;
    }>;
}

const typeStyles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    danger: 'bg-red-50 border-red-200 text-red-800',
};

export default function WarningCard({ warnings }: WarningCardProps) {
    if (!warnings || warnings.length === 0) return null;

    return (
        <div className="space-y-2 mt-4">
            {warnings.map((warning, index) => (
                <div
                    key={index}
                    className={`p-3 rounded-lg border ${typeStyles[warning.type]} flex items-center gap-2`}
                >
                    <span className="text-xl">{warning.icon}</span>
                    <span className="text-sm font-medium">{warning.message}</span>
                </div>
            ))}
        </div>
    );
}
