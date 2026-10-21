# Kısa devir — 22 Ekim 2026

- PR #24 aynı başarılı HEAD koşuluyla main’e birleşti. Katalogdaki altı Simulator akışı kullanıcı tarafından doğrulandı.
- `feat/mobile-session`: kayıt/giriş/hesap ve yalnız cihazda çıkış; SecureStore ve yarış koşullarına karşı yenileme/temizleme. [Mobil oturum](../mobile/docs/session.md) test kapsamını, çıkışın sunucu iptali sağlamadığını ve kısa manuel kontrolü açıklar.
- Backend/web, şema, kök README/About değişmedi. Geçici hesaplar temizlendi. Yeni özellik PR’ı inceleme için açık bırakılır.
- **Devam:** PR #25 `40a34b3` ve CI başarılı. Gerçek cihaz hazırlığında 29 test/typecheck/lint ve Android Metro export geçti; fiziksel cihaz henüz bağlı değil. Android Platform Tools 37.0.1 hazır. [Android USB adımları/kabul kaydı](../mobile/docs/device-validation.md): API/Metro localhost kalır, yalnız iki ADB reverse portu kullanılır; DB/LAN açılmaz. Önce Android model/sürüm + USB izni ve kabulü, ardından iPhone. Kullanıcı sonuçları kullanıcı doğrulaması olarak kaydedilecek. Yeni merge/deployment yok.
