# Kısa devir — 22 Ekim 2026

- PR #25 açık; merge/deployment yok. Kök README/About ve backend/DB değişmedi.
- **Kullanıcı doğrulaması tamamlandı:** Galaxy A72 / Android 14 / One UI 6.1 / Expo Go 58.0.5 ve iPhone 13 / iOS 26.6.1 / yerel Bite Routine development build. Katalog, kayıt hata düzeltme, yanlış/doğru giriş, oturumlu yeniden açılış/arka plan, ağ kesintisi/toparlanma ve çıkış geçti.
- **Otomatik/agent kontrolleri:** 29 test, TypeScript/lint/SDK uyumu, Metro paketleme ve gerçek HTTPS Identity smoke başarılı; tek sentetik hesap temizlendi. İmzalı arm64 iPhone Debug build/kurulum ve gerçek cihaz katalog görüntüsü ayrıca doğrulandı. HTTP bellek deposu testi native SecureStore testi değildir.
- Opak bearer ve SecureStore kullanılır; çıkış cihaz tokenlarını temizler, sunucuda bearer iptali sağlamaz. [Sözleşme](../mobile/docs/session.md).
- Yalnız bu işin iPhone proxy/Metro süreçleri durduruldu, repo dışındaki geçici anahtarlar temizlendi. Kullanıcı iPhone’dan yalnız **Bite Routine Temporary Device Test CA** profilini kaldırmalı. Yerel API korunur.
- Sıradaki iş PR #25 son incelemesi; merge için ayrı açık talimat gerekir. [Cihaz kabulü, kanıt ayrımı ve kalan bağımlılık riskleri](../mobile/docs/device-validation.md). Kişisel imzalama bilgileri repoda yoktur.
