# Mobil favoriler

Mevcut API: sayfalı `GET /me/favorite-meals?page=…&pageSize=100`,
`PUT /me/favorite-meals/{mealId}` ve `DELETE /me/favorite-meals/{mealId}`.
Kişisel liste bütün sayfaları okur; güncel katalog bilgisi kullanılır. Backend/migration değişmez.

## Davranış

Katalog/detayda açık favori düğmesi; oturumsuz kullanıcıya giriş bağlantısı.
Favorilerim listesi yüklenme, boş, hata ve manuel yenileme sunar. Gıdadan mevcut
detay ekranındaki gram/kaynaklı ölçü formuna geçilir; gram ve besin dönüşümünü sunucu yapar.
Eksik besin sıfır olmaz. Oturumun mevcut tek refresh ve origin sınırı korunur.

Favoriler yalnız oturum/hesap kapsamlı bellektedir; disk veya ortak cache yoktur.
Hesap değişince eski liste hemen ayrılır; geç GET/mutasyon yeni hesabı değiştiremez.
Bir işlem sürerken ikinci mutasyon engellenir; başarıda GET ile kesin liste okunur.
Belirsiz ağ sonucunda PUT/DELETE tekrarlanmaz; kullanıcı GET ile kontrol eder.
Ekrana/uygulamaya dönüşte liste yenilenir.

Ücretsiz telefon geçidi yalnız bu üç favori yolunu ekler. Sentetik hesap ve bearer
zorunludur; gerçek hesaplar ve çerezler reddedilir. [Tek komut](../../docs/mobile-local-test.md).

## Kontroller ve kalan kabul

- 71 mobil test: sayfalama, null/sıfır, çift dokunma, hata/yenileme, belirsiz sonuç,
  oturum/hesap değişimi, geç yanıt, StrictMode yeniden başlatma ve RN ekranları.
- TypeScript/lint, SDK uyumu, iOS/Android Metro paketlemesi; bunlar native build değildir.
- 9 araç testi: yalnız gerekli GET/PUT/DELETE, yanlış yöntem/kimlik ve gerçek hesap/çerez reddi.
- Gerçek HTTPS API'de ekleme/çıkarma, yeniden okuma sonrası kalıcılık, iki hesap ayrımı ve
  gram/kesirli ölçü günlük akışı geçti. Rastgele HTTP hesapları ve kayıtları temizlendi.
- iOS 27.1 iPhone Duo Simulator’da favori ekleme/çıkarma, tam kapat/aç sonrası kalıcılık, favoriden 100 g günlük kaydı ve 143 kcal toplamı, boş liste ve çıkış sonrası giriş gereği native ekranda doğrulandı. İki hesap ayrımı gerçek API ve RN testleriyle doğrulandı; Simulator’da ikinci hesapla tam geçiş yapılmış sayılmaz. Simulator sentetik hesapları/kayıtları temizlendi; kendi API/Metro ve Simulator kapatıldı, tünel açık bırakılmadı. Önceden açık API/PostgreSQL korundu.
- Yeni favorilerin fiziksel iPhone kabulü henüz yapılmadı. Önceki günlük/tünel iPhone
  sonuçları kullanıcı doğrulamasıdır; yeni özelliğe aktarılmaz. Samsung fiziksel kabulü
  **cihaz mevcut değil — bekliyor**; yayın öncesi kontrol olarak kalır.

### iPhone kısa kabul

1. Mac'te test komutunu aç; iPhone QR'ıyla Bite Routine'i aç. Sentetik test hesabıyla giriş yap.
2. Katalog/detaydan favori ekle; Favorilerim'de gör. Tam kapat/açınca kalsın.
3. Favoriden gram veya 1,5 adetle günlüğe ekle; kayıt/toplamı kontrol et. Favoriyi çıkar; liste boşalsın.
4. Diğer sentetik hesaba geç: önceki favoriler görünmesin. Çıkıştan sonra kişisel liste kapanmalı.

Bitince terminalde Ctrl+C; CA profili veya USB gerekmez. Ücretli kaynak/deployment yoktur.
