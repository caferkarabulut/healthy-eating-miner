# Mobil günlük düzenleme ve silme

23 Ekim 2026. PR #26’nın değişmeyen `4acf4a0` HEAD’i başarılı CI ve son incelemeyle aynı HEAD koşuluyla birleştirildi; yerel main `bdc97f2` fast-forward güncellendi, `feat/mobile-diary-edit` buradan açıldı. Başlangıç çalışma ağacı temizdi. ROADMAP dosyası yok; kısa devir mevcut belgelerde tutulur.

## Mevcut HTTP sözleşmesi

Mevcut [PATCH/DELETE günlük sözleşmesi](../../backend-dotnet/docs/diary-contract.md) kullanılır. Backend/model/migration, web, kök README/About değişmedi. Yeni endpoint, favori, geçmiş veya onboarding yoktur.

- PATCH `/me/diary-entries/{id}`: gün zorunlu; öğün ve gerekiyorsa yalnız `grams` ya da `portionId` + `quantity`. Türkçe virgül ve kesirli miktar desteklenir; gram/dönüşüm/besin hesabını sunucu yapar.
- Yalnız gün/öğün veya sayısal olarak aynı miktar değiştirilirken miktar alanları **gönderilmez**. Böylece eski gram ve ölçü/kaynak kopyası korunur. Ölçülü kayıttan açıkça grama geçiş `grams` gönderir, kopyayı sunucu null yapar.
- DELETE aynı kayıt yoluna gövdesiz gider; 204 başarı yanıtında JSON okunmaz. Kullanıcı/CSRF/bearer sözleşmeleri aynıdır. 404, olmayan/silinen/başkasına ait kaydı ayırmadan “Kayıt artık bulunamıyor” mesajı verir. Geçersiz yenilemede mevcut oturum temizliği ve giriş ekranı kullanılır.

## Kayıtlı ölçü ve güncel kaynak

Mobil yanıt tipi tam `portion` kopyasını taşır: portionId, quantity, measureName, sourceAmount, sourceGramWeight ve bütün kaynak kimliği/açıklama/URL alanları. Satır ve ilk düzenleme miktarı bu kopyayı kullanır; canlı katalogdan geçmiş değer üretilmez.

Kayıtlı ölçüyle miktar değişikliği ancak güncel ölçü kimliği, kaynak miktar/gramı ve kaynak metadatası kopyayla eşleşiyorsa gönderilebilir. Ölçü değişmiş/kaldırılmış veya yüklenememişse tarih/öğün eski miktarla değişebilir; miktar değişikliği için kullanıcı gram ya da **Güncel:** etiketli ölçüyü açıkça seçer. Seçilen güncel ölçünün birim gramı ve yeniden dönüşüm açıklaması görünür. USDA cup, Türk su bardağı diye adlandırılmaz.

Mevcut API kaynak sürümünü kilitleyen bir koşullu PATCH sunmaz. Bu nedenle bütün ölçülü **miktar değişikliklerinde** güncel kaynak kullanılacağı önceden açıkça belirtilir; yalnız tarih/öğün değişikliğinde eski dönüşümün aynen korunması garanti edilir. Güncel ölçüye sessiz geçiş yapılmaz; ölçü bulunamadığında geçmiş kayıt listelenmeye devam eder.

## Ekran ve istek davranışı

Kompakt satırdaki Düzenle formu seçimle açılır; Sil native onay penceresi gösterir. Vazgeç veya Android dışarı dokunarak iptal istek göndermez. Onay ve istek sürerken ortak senkron kilit çift dokunmayı ve çakışan satır işlemlerini engeller; gün/öğün alanları kapanır. Onay ekranı eski hesaptan kalmışsa işlem gönderilmez.

Başarı seçilen günü no-store GET ile yeniden okur; günlük ve öğün toplamları aynı yanıttan gelir. Başka güne taşınan kayıt eski günden çıkar; yeni gün bilgisi mesajda gösterilir. Gıda/besin/kaynak kopyaları sunucuda korunur. Tarih/hesap değişiminde eski form, yanıt veya başarı mesajı yeni ekranı ezmez.

Ağ/5xx/okunamayan başarı yanıtı belirsiz kabul edilir; PATCH/DELETE otomatik tekrarlanmaz. İlgili satırın yazma işlemleri kapanır; açık “Sonucu kontrol etmek için günlüğü yenile” GET yolu sunulur. 404 için de yenileme vardır. Mevcut tek refresh ve yalnız alınmış 401 sonrası tek yetkilendirme denemesi korunur.

## Doğrulama

- **61 mobil test:** gram/kesirli adet, eski/kaldırılmış/değişmiş ölçü, miktar atlama, tarih taşıma, silme iptal/onay, toplam yenileme, belirsiz ağ sonucu/404, çift gönderim, eski hesap onayı/geç PATCH yanıtı ve oturum bitmesi. TypeScript, lint, SDK uyumu ve iOS/Android Metro paketlemesi geçti. CI mevcut test keşfiyle aynı kontrolleri çalıştırır; yeni native paket yoktur.
- **Gerçek localhost API / PostgreSQL 17 geliştirme DB’si:** iki sentetik hesapla gram ve 2,5 orta adet = 110 g düzenleme, date/slot-only PATCH sonrası tam snapshot eşitliği, eski/yeni gün ve öğün toplamları, yeniden oturum yükleme, geçersiz gram, başka kullanıcıda 404, silme ve tekrarlanan silmede 404 doğrulandı. Kaynak değişmiş/kaldırılmış senaryosu istemci testleriyle doğrulandı; mevcut katalog seed’i/verisi değiştirilmedi.
- **iPhone Duo / iOS 27.1 Simulator / Expo Go:** ayrı sentetik hesapla 1,5 → 2,5 adet ve Kahvaltı → Ara öğün, 157,3 kcal; miktarı koruyup ertesi güne/Akşam’a taşıma, eski günün boşalması, gramla 150,25 g düzenleme ve 214,9 kcal, native silme onayını iptal etme ve sonra onaylayarak sıfır toplam/boş liste doğrulandı. Gerçek native görüntü/erişilebilirlik kullanıldı; web önizlemesi değildir. Geçici açılış/ekran yakalama araç hatalarından sonra gerçek ekran ve sonuç ayrıca doğrulandı. Ağ/yarış/oturum değişimi otomatik test kanıtıdır; fiziksel cihaz sonucu diye sunulmaz.
- Sentetik hesaplar ve bağlı kayıtlar yalnız doğrulanmış `bite_routine` geliştirme DB’sinden temizlendi; mevcut kullanıcı/katalog verileri korundu. Backend değişmediği için bütün backend testleri tekrarlanmadı.

## iPhone ve Samsung manuel kabulü

Her cihazda ayrı, kendi test kaydınızla deneyin; yeni düzenleme/silme ekranlarının fiziksel kabulü henüz yapılmadı:

1. Gram kaydını 150,25 g yapın; aynı gün ve öğün toplamları yenilensin. Geçersiz 0 veya üç ondalıklı gram gönderilmesin.
2. 1,5 Orta adet kaydını açın; kayıtlı miktar/gram doğru gelsin. 2,5 adet yapınca yaklaşık 110 g görünsün.
3. Miktara dokunmadan gün ve öğünü değiştirin; gram/ölçü aynı kalsın, kayıt eski günden çıksın ve yeni günün doğru öğününde görünsün. Tam kapatıp açınca değişiklik korunsun.
4. Sil → Vazgeç: kayıt/toplam korunsun. Sil → Sil: kayıt kalksın ve iki toplam yenilensin. Tekrar dokunma ikinci istek oluşturmasın.
5. Bağlantı kesintisinde anlaşılır hata olsun; belirsiz işlemi tekrar göndermeden Günlüğü yenile ile kontrol edin. İkinci hesaba geçince önceki hesap satırı/formu görünmesin.
6. Klavye açıkken formu kaydırıp gün/öğün ve kaydet düğmesine erişin.

Bağlantı için [önceki cihaz yöntemi](device-validation.md) kullanılır. Bu görevde fiziksel bağlantı açılmadı. Görev başında eski iPhone/Samsung geliştirme portları kapalıydı; yalnız Simulator Metro başlatılıp kullanım sonunda durduruldu. Önceki iPhone testinin repo dışı CA/sunucu anahtarları ve sertifika aktarım klasörü temizlendi. 5443/8082/8083/8081 portlarında dinleyici kalmadı; mevcut localhost API korundu. Android bağlı değildi; toplu ADB temizliği yapılmadı.

**Kalan manuel temizlik:** iPhone → Ayarlar → Genel → VPN ve Aygıt Yönetimi → **Bite Routine Temporary Device Test CA** → Profili Sil. Yalnız bu geçici profil kaldırılmalı; Apple Development veya başka profiller silinmez. Önceki profilin kaldırıldığı henüz bildirilmedi. Yeni fiziksel test için bağlantı yeniden hazırlanır; veritabanı ağa açılmaz.
