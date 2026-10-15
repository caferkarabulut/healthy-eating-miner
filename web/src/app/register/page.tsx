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
        <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#f7f8f4] text-[#18312c]">
            <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-md border border-[#d9e4dc]">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-[#18312c] mb-2">Bite Routine</h1>
                    <p className="text-[#5b7166]">Kayıt Ol</p>
                </div>

                {success ? (
                    <div className="bg-[#e5f3e9] border border-[#b8d6c2] text-[#205942] px-4 py-3 rounded-lg text-center">
                        <p role="status">Kayıt başarılı! Şimdi giriş yapabilirsiniz.</p>
                        <Link href="/login" className="mt-4 inline-block rounded-lg bg-[#277f64] px-5 py-3 font-semibold text-white">Giriş yap</Link>
                    </div>
                ) : (
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
                                onChange={(e) => dispatch({ type: 'change', field: 'email', value: e.target.value })}
                                disabled={loading}
                                aria-invalid={Boolean(fieldErrors.email)}
                                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                                className="w-full px-4 py-3 bg-white border border-[#b8d6c2] rounded-lg text-[#18312c] placeholder-[#698074] focus:outline-none focus:ring-2 focus:ring-[#277f64] focus:border-transparent transition"
                                placeholder="ornek@email.com"
                                required
                            />
                            {fieldErrors.email && <p id="email-error" role="alert" className="mt-2 text-sm text-[#a33c35]">{fieldErrors.email}</p>}
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-[#18312c] mb-2">
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
                                className="w-full px-4 py-3 bg-white border border-[#b8d6c2] rounded-lg text-[#18312c] placeholder-[#698074] focus:outline-none focus:ring-2 focus:ring-[#277f64] focus:border-transparent transition"
                                placeholder="••••••••"
                                required
                                minLength={8}
                            />
                            {fieldErrors.password && <p id="password-error" role="alert" className="mt-2 text-sm text-[#a33c35]">{fieldErrors.password}</p>}
                        </div>

                        {error && (
                            <div role="alert" className="bg-[#fff3f1] border border-[#e4b8b0] text-[#a33c35] px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-[#277f64] text-white font-semibold rounded-lg hover:bg-[#205942] focus:outline-none focus:ring-2 focus:ring-[#277f64] focus:ring-offset-2 focus:ring-offset-white transition disabled:opacity-50"
                        >
                            {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
                        </button>
                    </form>
                )}

                <div className="mt-6 text-center">
                    <Link href="/" className="mb-4 inline-block text-[#246b53] hover:text-[#173f34]">Yemek kataloğuna dön</Link>
                    <p hidden={success} className="text-[#5b7166]">
                        Zaten hesabın var mı?{' '}
                        <Link href="/login" className="text-[#246b53] hover:text-[#173f34] font-medium">
                            Giriş Yap
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
