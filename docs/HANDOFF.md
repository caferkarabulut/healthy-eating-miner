# Kısa devir — 23 Ekim 2026

- PR #26, değişmeyen `4acf4a0` HEAD ve başarılı CI ile aynı HEAD koşuluyla birleşti. Yerel main `bdc97f2` fast-forward; aktif dal `feat/mobile-diary-edit`.
- Mobil düzenleme/silme mevcut API’yi kullanır: gram/kesirli ölçü, gün/öğün, native onay ve toplam yenileme. Kayıtlı kaynak kopyası korunur; yalnız gün/öğün değişiminde miktar alanları atlanır. Değişmiş/kaldırılmış kaynak sessizce kullanılmaz. Oturum, geç yanıt, çift/belirsiz gönderim korumaları vardır.
- 61 test, TypeScript/lint/SDK uyumu ve iki platform Metro paketlemesi; gerçek API + iOS 27.1 Simulator’da düzenleme/taşıma/silme iptal/onay/toplamlar doğrulandı. Sentetik veriler temizlendi; backend/web/DB modeli ve kök README/About değişmedi.
- Geçici Metro kapatıldı, önceki iPhone CA/sunucu anahtarları temizlendi. Kullanıcı telefondan yalnız **Bite Routine Temporary Device Test CA** profilini kaldırmalı. [Ayrıntı ve manuel liste](../mobile/docs/diary-edit.md).
- Sırada yeni PR son incelemesi ve iki fiziksel cihazda bu yeni akışın kullanıcı kabulü var. Yeni PR merge edilmez; deployment/dal silme yapılmaz.
