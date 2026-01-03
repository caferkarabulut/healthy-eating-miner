'use client';

import { useEffect, useState } from 'react';

interface Warning {
    type: 'warning' | 'info' | 'success';
    message: string;
}

interface DailyFeedbackProps {
    warnings: Warning[];
}

export default function DailyFeedback({ warnings }: DailyFeedbackProps) {
    if (!warnings || warnings.length === 0) {
        return (
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-2">🧠 Günlük Geri Bildirim</h3>
                <div className="bg-gray-700/30 rounded-xl p-4 border border-gray-600 flex items-center gap-3">
                    <span className="text-2xl">👌</span>
                    <p className="text-green-400 font-medium">Bugün için özel bir uyarı yok, her şey yolunda!</p>
                </div>
            </div>
        );
    }

    const typeConfig = {
        warning: { icon: '⚠️', bg: 'bg-yellow-500/10', border: 'border-yellow-500/50', text: 'text-yellow-400' },
        info: { icon: 'ℹ️', bg: 'bg-blue-500/10', border: 'border-blue-500/50', text: 'text-blue-400' },
        success: { icon: '✅', bg: 'bg-green-500/10', border: 'border-green-500/50', text: 'text-green-400' }
    };

    return (
        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">🧠 Günlük Geri Bildirim</h3>

            <div className="space-y-3">
                {warnings.map((w, index) => {
                    const style = typeConfig[w.type] || typeConfig.info;
                    return (
                        <div
                            key={index}
                            className={`${style.bg} ${style.border} border rounded-xl p-4 flex items-start gap-3 transition hover:bg-opacity-70`}
                        >
                            <span className="text-xl mt-0.5">{style.icon}</span>
                            <p className={`${style.text} font-medium`}>{w.message}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
