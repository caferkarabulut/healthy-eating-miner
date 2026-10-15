'use client';

import { useReducer, useRef } from 'react';
import Link from 'next/link';
import { authPost, AuthRequestError } from '@/lib/auth-client';
import { initialRegisterState, registerReducer } from '@/lib/register-feedback';

export default function RegisterPage() {
    const [{ email, password, error, fieldErrors, loading, success }, dispatch] = useReducer(registerReducer, initialRegisterState);
    const pending = useRef(false);
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pending.current) return;
        pending.current = true;
        dispatch({ type: 'submit' });
        try {
            await authPost('/api/auth/register', { email, password });
            dispatch({ type: 'success' });
        } catch (reason) {
            dispatch({ type: 'failure', error: reason instanceof AuthRequestError ? reason.message : 'Kayıt tamamlanamadı. Bağlantınızı kontrol edip yeniden deneyin.',
                fieldErrors: reason instanceof AuthRequestError ? reason.fieldErrors : undefined });
        } finally { pending.current = false; }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">🥗 Bite Routine</h1>
                    <p className="text-gray-400">Kayıt Ol</p>
                </div>

                {success ? (
                    <div className="bg-green-500/20 border border-green-500 text-green-400 px-4 py-3 rounded-lg text-center">
                        <p role="status">Kayıt başarılı! Şimdi giriş yapabilirsiniz.</p>
                        <Link href="/login" className="mt-4 inline-block rounded-lg bg-green-600 px-5 py-3 font-semibold text-white">Giriş yap</Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                                E-posta
                            </label>
                            <input
                                id="email"
                                type="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => dispatch({ type: 'change', field: 'email', value: e.target.value })}
                                disabled={loading}
                                aria-invalid={Boolean(fieldErrors.email)}
                                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                                placeholder="ornek@email.com"
                                required
                            />
                            {fieldErrors.email && <p id="email-error" role="alert" className="mt-2 text-sm text-red-400">{fieldErrors.email}</p>}
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                                Şifre
                            </label>
                            <input
                                id="password"
                                type="password"
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => dispatch({ type: 'change', field: 'password', value: e.target.value })}
                                disabled={loading}
                                aria-invalid={Boolean(fieldErrors.password)}
                                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                                placeholder="••••••••"
                                required
                                minLength={8}
                            />
                            {fieldErrors.password && <p id="password-error" role="alert" className="mt-2 text-sm text-red-400">{fieldErrors.password}</p>}
                        </div>

                        {error && (
                            <div role="alert" className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition disabled:opacity-50"
                        >
                            {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
                        </button>
                    </form>
                )}

                <div className="mt-6 text-center">
                    <Link href="/" className="mb-4 inline-block text-green-400 hover:text-green-300">Yemek kataloğuna dön</Link>
                    <p hidden={success} className="text-gray-400">
                        Zaten hesabın var mı?{' '}
                        <Link href="/login" className="text-green-400 hover:text-green-300 font-medium">
                            Giriş Yap
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
