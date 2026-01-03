'use client';

interface EmptyStateProps {
    icon: string;
    title: string;
    description: string;
    actionText?: string;
    onAction?: () => void;
}

export default function EmptyState({
    icon,
    title,
    description,
    actionText,
    onAction
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center text-center py-8 px-4">
            <div className="text-5xl mb-4">{icon}</div>
            <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
            <p className="text-gray-400 mb-4 max-w-sm">{description}</p>
            {actionText && onAction && (
                <button
                    onClick={onAction}
                    className="px-5 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-lg hover:from-green-600 hover:to-emerald-700 transition"
                >
                    {actionText}
                </button>
            )}
        </div>
    );
}
