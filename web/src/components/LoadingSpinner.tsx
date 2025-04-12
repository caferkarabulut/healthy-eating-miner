'use client';

export default function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
    const sizeClasses = {
        sm: 'h-4 w-4 border-2',
        md: 'h-8 w-8 border-2',
        lg: 'h-12 w-12 border-3'
    };

    return (
        <div className="flex items-center justify-center py-4">
            <div
                className={`animate-spin rounded-full ${sizeClasses[size]} border-green-400 border-t-transparent`}
            />
        </div>
    );
}

export function LoadingSkeleton({ lines = 3 }: { lines?: number }) {
    return (
        <div className="animate-pulse space-y-3">
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={i}
                    className={`h-4 bg-gray-700 rounded ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
                />
            ))}
        </div>
    );
}

export function CardSkeleton() {
    return (
        <div className="animate-pulse bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
            <div className="h-6 bg-gray-700 rounded w-1/3 mb-4" />
            <div className="space-y-3">
                <div className="h-4 bg-gray-700 rounded w-full" />
                <div className="h-4 bg-gray-700 rounded w-5/6" />
                <div className="h-4 bg-gray-700 rounded w-4/6" />
            </div>
        </div>
    );
}
