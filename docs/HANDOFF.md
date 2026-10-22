# Kısa devir — 22 Ekim 2026

- PR #25 açık; merge/deployment yok. Kök README/About ve backend/DB değişmedi.
- **Android kullanıcı doğrulaması:** Galaxy A72 / Android 14 / One UI 6.1 / Expo Go 58.0.5, tüm cihaz kabul listesi geçti. USB kopunca yalnız iki reverse yeniden kurulur.
- **iPhone kullanıcı doğrulaması:** iPhone 13 / iOS 26.6.1, geçici CA/profil güveni ve Safari HTTPS API sağlığı geçti. App Store Expo Go 57 SDK 58’i açmadı; yerel development build’e geçildi.
- **Agent gerçek cihaz kontrolü:** Developer Mode/DDI, imzalı arm64 Debug build, codesign doğrulaması, kurulum ve native süreç yeniden açılışı başarılı. Gerçek iPhone yansıtmasında ilk/soğuk açılışta katalog ve 30 sonuç görüldü. Tıklamalar araç hatası verdi; iPhone form/oturum testleri tamamlanmış sayılmaz.
- **Otomatik kontroller:** 29 test/typecheck/lint/SDK uyumu/iOS paketleme ve sertifika doğrulaması açık gerçek HTTPS katalog/Identity smoke geçti; üç eşzamanlı istekte tek refresh dahil. Tek sentetik hesap temizlendi; token/parola loglanmadı. HTTP bellek deposu testi native SecureStore testi değildir.
- **Kalan kullanıcı kontrolü:** iPhone arama/detay, kayıt hata düzeltme, yanlış/doğru giriş, oturumlu tam açılış/arka plan, Wi-Fi kesintisi/toparlanma, çıkış. [Kabul listesi, risk ve kanıt ayrımı](../mobile/docs/device-validation.md).
- Uygulama, HTTPS geçidi ve development Metro açık bırakıldı. Kabul bitince iPhone’daki geçici CA profili kaldırılmalı; yalnız bizim geçitler durdurulup repo dışındaki geçici anahtarlar temizlenmeli. Kişisel Team/sertifika/anahtarlar repoda yok.
