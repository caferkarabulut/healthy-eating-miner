# Kısa devir — 22 Ekim 2026

- PR #25 açık. Mobil oturum kodu ve SDK 58 tabanı korunur; yeni özellik/merge/deployment yok.
- Galaxy A72 / Android 14 / One UI 6.1 / Expo Go 58.0.5: tüm cihaz kabul listesi **kullanıcı doğrulamasıyla** geçti. USB kopunca reverse yeniden kurulur.
- iPhone 13 / iOS 26.6.1: geçici CA/profil güveni ve Safari HTTPS API sağlığı **kullanıcı doğrulamasıyla** geçti. App Store Expo Go 57 SDK 58’i açmadı; iPhone uygulama kabulü yapılmadı.
- Yerel development build desteği, Expo CNG ve CocoaPods hazır; 29 test/typecheck/lint/SDK uyumu/iOS paketlemesi başarılı. Ağ denetleyicisi yerel build’de kapalı tutulur; API localhost kalır.
- Xcode Apple hesabı eklendi. Workspace açıldı; Signing & Capabilities → Team hâlen None. Kullanıcı Personal Team seçimi ve gerekiyorsa Developer Mode tamamlayacak; sonra imzalı derleme/kurulum ve iPhone kabulü.
- [Cihaz kaydı ve geçici HTTPS kurulumu](../mobile/docs/device-validation.md). Test sonunda iPhone’daki geçici CA profili kaldırılmalı; yalnız bizim geçit süreçleri durdurulup repo dışındaki geçici anahtarlar temizlenmeli. Kök README/About ve backend/DB değişmedi.
