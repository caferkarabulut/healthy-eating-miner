'use client';

import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';

interface ProfileSetupProps {
    onComplete: () => void;
    isModal?: boolean;
}

export default function ProfileSetup({ onComplete, isModal = false }: ProfileSetupProps) {
    const [heightCm, setHeightCm] = useState(170);
    const [weightKg, setWeightKg] = useState(70);
    const [gender, setGender] = useState('male');
    const [birthYear, setBirthYear] = useState(1990);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;

    // Tahmini BMR
    const estimatedBmr = gender === 'male'
        ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
        : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

    const handleSubmit = async () => {
        setSaving(true);
        setError('');

        try {
            const res = await apiRequest('/profile', {
                method: 'POST',
                body: JSON.stringify({
                    height_cm: heightCm,
                    weight_kg: weightKg,
                    gender,
                    birth_year: birthYear,
                }),
            });

            if (res.ok) {
                onComplete();
            } else {
                setError('Profil kaydedilemedi. Değerleri kontrol edin.');
            }
        } catch {
            setError('Bir hata oluştu.');
        }
        setSaving(false);
    };

    const containerClass = isModal
        ? 'fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4'
        : '';

    return (
        <div className={containerClass}>
            <div className="bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 w-full max-w-md">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">📋 Profil Bilgileri</h2>
                    <p className="text-gray-400 text-sm">
                        Kişiselleştirilmiş kalori hedefi için bilgilerinizi girin.
                    </p>
                </div>

                <div className="space-y-4">
                    {/* Gender */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Cinsiyet</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setGender('male')}
                                className={`py-3 rounded-lg border transition ${gender === 'male'
                                        ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                                        : 'border-gray-600 bg-gray-700/50 text-gray-300'
                                    }`}
                            >
                                👨 Erkek
                            </button>
                            <button
                                type="button"
                                onClick={() => setGender('female')}
                                className={`py-3 rounded-lg border transition ${gender === 'female'
                                        ? 'border-pink-500 bg-pink-500/20 text-pink-400'
                                        : 'border-gray-600 bg-gray-700/50 text-gray-300'
                                    }`}
                            >
                                👩 Kadın
                            </button>
                        </div>
                    </div>

                    {/* Birth Year */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Doğum Yılı ({age} yaş)
                        </label>
                        <input
                            type="number"
                            value={birthYear}
                            onChange={(e) => setBirthYear(Number(e.target.value))}
                            min={1940}
                            max={2010}
                            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500"
                        />
                    </div>

                    {/* Height */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Boy ({heightCm} cm)
                        </label>
                        <input
                            type="range"
                            value={heightCm}
                            onChange={(e) => setHeightCm(Number(e.target.value))}
                            min={120}
                            max={230}
                            className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>120 cm</span>
                            <span>230 cm</span>
                        </div>
                    </div>

                    {/* Weight */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Kilo ({weightKg} kg)
                        </label>
                        <input
                            type="range"
                            value={weightKg}
                            onChange={(e) => setWeightKg(Number(e.target.value))}
                            min={30}
                            max={200}
                            className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>30 kg</span>
                            <span>200 kg</span>
                        </div>
                    </div>

                    {/* BMR Preview */}
                    <div className="bg-gray-700/30 rounded-xl p-4 text-center">
                        <p className="text-gray-400 text-sm">Tahmini Bazal Metabolizma (BMR)</p>
                        <p className="text-3xl font-bold text-green-400">{estimatedBmr.toFixed(0)} kcal/gün</p>
                        <p className="text-gray-500 text-xs mt-1">Hiç hareket etmeden yakılan kalori</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 transition disabled:opacity-50"
                    >
                        {saving ? 'Kaydediliyor...' : '💾 Kaydet ve Devam Et'}
                    </button>
                </div>
            </div>
        </div>
    );
}
