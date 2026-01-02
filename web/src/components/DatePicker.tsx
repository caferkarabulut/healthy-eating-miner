'use client';

import { useState } from 'react';

interface DatePickerProps {
    selectedDate: string;
    onChange: (date: string) => void;
}

export default function DatePicker({ selectedDate, onChange }: DatePickerProps) {
    return (
        <div className="flex items-center gap-4">
            <label className="text-gray-400 text-sm">Tarih:</label>
            <input
                type="date"
                value={selectedDate}
                onChange={(e) => onChange(e.target.value)}
                className="px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
        </div>
    );
}
