'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginToCatalog } from '@/lib/login-flow';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const destination = await loginToCatalog({ email, password });
            router.replace(destination);
            router.refresh();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Giriş yapılamadı.');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#f7f8f4] text-[#18312c]">
            <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-md border border-[#d9e4dc]">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-[#18312c] mb-2">Bite Routine</h1>
                    <p className="text-[#5b7166]">Giriş Yap</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-[#18312c] mb-2">
                            E-posta
                        </label>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-[#b8d6c2] rounded-lg text-[#18312c] placeholder-[#698074] focus:outline-none focus:ring-2 focus:ring-[#277f64] focus:border-transparent transition"
                            placeholder="ornek@email.com"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-[#18312c] mb-2">
                            Şifre
                        </label>
                        <input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-[#b8d6c2] rounded-lg text-[#18312c] placeholder-[#698074] focus:outline-none focus:ring-2 focus:ring-[#277f64] focus:border-transparent transition"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && (
                        <div className="bg-[#fff3f1] border border-[#e4b8b0] text-[#a33c35] px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 bg-[#277f64] text-white font-semibold rounded-lg hover:bg-[#205942] focus:outline-none focus:ring-2 focus:ring-[#277f64] focus:ring-offset-2 focus:ring-offset-white transition disabled:opacity-50"
                    >
                        {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <Link href="/" className="mb-4 inline-block text-[#246b53] hover:text-[#173f34]">Yemek kataloğuna dön</Link>
                    <p className="text-[#5b7166]">
                        Hesabın yok mu?{' '}
                        <Link href="/register" className="text-[#246b53] hover:text-[#173f34] font-medium">
                            Kayıt Ol
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
