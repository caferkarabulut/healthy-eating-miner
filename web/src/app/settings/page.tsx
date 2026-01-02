'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, logout, apiRequest } from '@/lib/api';

interface Profile {
    height_cm: number;
    weight_kg: number;
    gender: string;
    birth_year: number;
    age: number;
    bmr: number;
}

export default function SettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [message, setMessage] = useState('');

    // Form state
    const [heightCm, setHeightCm] = useState(170);
    const [weightKg, setWeightKg] = useState(70);
    const [gender, setGender] = useState('male');
    const [birthYear, setBirthYear] = useState(1990);

    useEffect(() => {
        if (!isAuthenticated()) {
            router.push('/login');
            return;
        }
        fetchProfile();
    }, [router]);

    const fetchProfile = async () => {
        const res = await apiRequest('/profile');
        if (res.ok) {
            const data = await res.json();
            if (data.has_profile) {
                setProfile(data);
                setHeightCm(data.height_cm);
                setWeightKg(data.weight_kg);
                setGender(data.gender);
                setBirthYear(data.birth_year);
            }
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage('');

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
            const data = await res.json();
            setProfile(data);
            setMessage('✅ Profil güncellendi!');
        } else {
            setMessage('❌ Kaydetme hatası.');
        }
        setSaving(false);
    };

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    const estimatedBmr = gender === 'male'
        ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
        : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="text-white text-xl">Yükleniyor...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            {/* Header */}
            <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-white">⚙️ Ayarlar</h1>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
                        >
                            ← Dashboard
                        </button>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition"
                        >
                            Çıkış
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
                {/* Profile Section */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
                    <h2 className="text-xl font-semibold text-white mb-6">📋 Vücut Bilgilerim</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                Boy: {heightCm} cm
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
                                Kilo: {weightKg} kg
                            </label>
                            <input
                                type="range"
                                value={weightKg}
                                onChange={(e) => setWeightKg(Number(e.target.value))}
                                min={30}
                                max={200}
                                step={0.5}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>30 kg</span>
                                <span>200 kg</span>
                            </div>
                        </div>
                    </div>

                    {/* BMR Preview */}
                    <div className="mt-6 bg-gray-700/30 rounded-xl p-4 text-center">
                        <p className="text-gray-400 text-sm">Tahmini Bazal Metabolizma (BMR)</p>
                        <p className="text-3xl font-bold text-green-400">{estimatedBmr.toFixed(0)} kcal/gün</p>
                    </div>

                    {/* Message & Save Button */}
                    {message && (
                        <div className={`mt-4 px-4 py-2 rounded-lg text-sm ${message.includes('✅')
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                            {message}
                        </div>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="mt-6 w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 transition disabled:opacity-50"
                    >
                        {saving ? 'Kaydediliyor...' : '💾 Profili Güncelle'}
                    </button>
                </div>

                {/* Info Card */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <p className="text-blue-400 text-sm">
                        📊 <strong>Neden önemli?</strong> Kilo ve boy bilgileriniz güncel tutulduğunda,
                        sistem size daha doğru kalori hedefleri ve kişiselleştirilmiş AI önerileri sunar.
                    </p>
                </div>
            </main>
        </div>
    );
}
