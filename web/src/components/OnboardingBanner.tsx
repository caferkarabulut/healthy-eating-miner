'use client';

import Link from 'next/link';

interface OnboardingBannerProps {
    type: 'profile' | 'activity' | 'meal';
    onDismiss?: () => void;
}

const bannerConfig = {
    profile: {
        icon: '👤',
        title: 'Profilini Tamamla',
        description: 'Boy, kilo ve yaş bilgilerini girerek kişiselleştirilmiş hedefler al.',
        href: '/settings',
        color: 'from-blue-500/20 to-purple-500/20',
        borderColor: 'border-blue-500/30',
        textColor: 'text-blue-400'
    },
    activity: {
        icon: '🏃',
        title: 'Bugünkü Aktiviteni Gir',
        description: 'Adım sayını girerek günlük kalori hedefini güncelle.',
        href: '#activity',
        color: 'from-orange-500/20 to-amber-500/20',
        borderColor: 'border-orange-500/30',
        textColor: 'text-orange-400'
    },
    meal: {
        icon: '🍽️',
        title: 'Öğün Ekle',
        description: 'Bugün ne yediğini kaydet ve beslenme takibine başla.',
        href: '#meals',
        color: 'from-green-500/20 to-emerald-500/20',
        borderColor: 'border-green-500/30',
        textColor: 'text-green-400'
    }
};

export default function OnboardingBanner({ type, onDismiss }: OnboardingBannerProps) {
    const config = bannerConfig[type];

    return (
        <div className={`bg-gradient-to-r ${config.color} rounded-xl p-4 border ${config.borderColor} flex items-center justify-between`}>
            <div className="flex items-center gap-3">
                <span className="text-2xl">{config.icon}</span>
                <div>
                    <h4 className={`font-medium ${config.textColor}`}>{config.title}</h4>
                    <p className="text-gray-400 text-sm">{config.description}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Link
                    href={config.href}
                    className={`px-4 py-2 bg-white/10 ${config.textColor} rounded-lg hover:bg-white/20 transition text-sm font-medium`}
                >
                    Başla →
                </Link>
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="p-2 text-gray-500 hover:text-gray-300 transition"
                    >
                        ✕
                    </button>
                )}
            </div>
        </div>
    );
}
