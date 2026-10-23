# Kısa devir — 22 Ekim 2026

- PR #25 doğrulanan `4c7ff5d` HEAD’i ve başarılı CI ile aynı HEAD koşuluyla main’e birleşti. Yerel main fast-forward; aktif dal `feat/mobile-diary`. Samsung/iPhone oturum kabulü ve geçici sertifika temizliği **kullanıcı doğrulamasıyla** tamamlandı.
- Mobil günlük: gün listesi, gram/kaynaklı ölçü ile ekleme, gün/öğün seçimi, öğün grupları ve API toplamları. Aynı oturum/tek refresh, null/sıfır, İstanbul günü; eski kullanıcı/tarih yanıtları ve çift/belirsiz POST korunur. Backend/web/DB modeli ve kök README/About değişmedi.
- Mobil test/typecheck/lint/SDK uyumu/paketleme ve gerçek API + iOS 27.1 Simulator akışları doğrulandı; sentetik hesaplar ve bağlı kayıtlar temizlendi. Geçici loopback hata geçidi/Metro kapatıldı; mevcut yerel API korunur. [Kanıt ayrımı ve manuel liste](../mobile/docs/diary.md).
- PR #26 açık. iPhone 13 / iOS 26.6.1 günlük testleri kullanıcı tarafından tamamlandı; Samsung için USB bağlantısı çalışıyor bildirimi alındı. Geçici iPhone HTTPS/Metro bağlantısı kullanıcının testi için yeniden açıldı ve şu an açık; bitince yalnız bu süreçler/anahtarlar ve geçici CA profili temizlenir. Sırada PR son incelemesi var; merge/deployment yapılmadı.
