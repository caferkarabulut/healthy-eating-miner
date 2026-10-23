# Gerçek cihaz doğrulaması — PR #25

22 Ekim 2026. Android önce, iPhone sonra tamamlandı. Yeni özellik, backend değişikliği, migration veya deployment yapılmadı.

## Cihaz kabulü

- **Samsung Galaxy A72 / Android 14 / One UI 6.1 / Expo Go 58.0.5:** aşağıdaki adımların tamamı kullanıcı tarafından doğrulandı. ADB model/sürümü ayrıca doğruladı. Uygulama kodu `40a34b3`; sonraki değişiklikler cihaz geliştirme desteği ve belgelerdir.
- **iPhone 13 / iOS 26.6.1 / Bite Routine 0.1.0 yerel development build:** aşağıdaki adımların tamamı kullanıcı tarafından doğrulandı. Kullanıcının son “hepsi tamam” bildirimi tüm kabul listesini kapsar; imzalı uygulama `5117926` koduyla derlendi.
- Parola/token, gerçek e-posta ve cihaz seri numarası kaydedilmez. Kullanıcının kendi test hesapları silinmedi; otomatik HTTP kontrolünün tek sentetik hesabı doğrulanmış geliştirme DB’sinden temizlendi.

| Kontrol | Beklenen sonuç | Android | iPhone |
| --- | --- | --- | --- |
| Katalog / Türkçe arama / detay / geri | Oturumsuz erişim ve doğru detay | Başarılı — kullanıcı doğrulaması | Başarılı — kullanıcı doğrulaması |
| Zayıf parola → düzelt → tekrar kayıt | Alan hatası temizlenir; yenilemeden kayıt | Başarılı — kullanıcı doğrulaması | Başarılı — kullanıcı doğrulaması |
| Yanlış şifre → düzelt → giriş / hesap | Güvenli hata; düzeltince giriş | Başarılı — kullanıcı doğrulaması | Başarılı — kullanıcı doğrulaması |
| Tam kapat / aç | Saklanan oturum /me ile doğrulanır | Başarılı — kullanıcı doğrulaması | Başarılı — kullanıcı doğrulaması |
| Arka plan / geri dön | Hesap yeniden doğrulanır | Başarılı — kullanıcı doğrulaması | Başarılı — kullanıcı doğrulaması |
| Ağ kesintisi / geri gelme | Oturum korunur; manuel tekrar denemeyle toparlanır | Başarılı — kullanıcı doğrulaması | Başarılı — kullanıcı doğrulaması |
| Çıkış / tam kapat / aç | Hesap giriş ister; katalog açık kalır | Başarılı — kullanıcı doğrulaması | Başarılı — kullanıcı doğrulaması |

Android’de USB çıkarılınca bağlantı hatası oturumu korudu. Tekrar bağlanınca kaybolan iki reverse yeniden kuruldu; Hesabı yenile ile giriş gerektirmeden toparlanma kullanıcı tarafından doğrulandı. Wi-Fi kapatmak USB bağlantısını kesmez. iPhone’da uygulama açıkken Wi-Fi ve hücresel veri kapatıldı; bağlantı geri geldiğinde manuel yeniden deneme çalıştı. Metro bağlantısı yokken soğuk açılışın JS yükleyememesi token silinmesi sayılmaz.

## Kanıtların ayrımı

- **Simulator:** önceki kullanıcı katalog/arama/detay/geri/sayfalama/boş sonuç doğrulaması; önceki agent native oturum/klavye kontrolü. Fiziksel cihaz sonucu yerine kullanılmadı.
- **Otomatik kontroller:** 29 davranış testi, TypeScript, lint ve SDK paket uyumu geçti. Yarış, ağ, geri yükleme ve çıkış senaryoları dahildir.
- **Paketleme:** Android/iOS Metro JS/assets başarılı; bunlar tek başına native cihaz kabulü değildir.
- **Agent gerçek iPhone kontrolü:** Developer Mode/DDI hazır; Xcode imzalı arm64 Debug build, codesign doğrulaması ve kurulum başarılı. Gerçek iPhone yansıtmasında ilk ve soğuk açılışta katalog/30 sonuç görüldü. Tıklama aracı `noWindowsAvailable` verdi; form/oturum kabulü yukarıdaki kullanıcı doğrulamasıdır.
- **Gerçek HTTPS API kontrolü:** katalog/Türkçe arama/100 g detay, anonim /me 401, kayıt/hata düzeltme, yanlış/doğru giriş, /me, üç eşzamanlı istekte tek refresh, yerel çıkış ve geçersiz refresh temizliği geçti. Sertifika doğrulaması açıktı. Bu Mac HTTP + bellekte TokenStore testidir; native SecureStore testi değildir. Refresh saat ileri alınarak tetiklendi, doğal token süresinin dolması beklenmedi.

[Oturum sözleşmesi](session.md): Identity bearer opaktır, JWT varsayılmaz. Tek eşzamanlı refresh ve çıkış sonrası geç yanıt/yazma koruması vardır; ağ/5xx saklanan oturumu silmez. Mobil çıkış yalnız cihaz tokenlarını temizler; sunucuda bearer iptali veya diğer cihazlardan çıkış sağlamaz.

## Android bağlantısı

Node 24 ve Android Platform Tools 37.0.1 kullanıldı; Android Studio/emulator kurulmadı. SDK 58 uyumlu resmî Expo Go 58.0.5 mevcut uygulama kaldırılmadan güncellendi. [ADB reverse](https://reactnative.dev/docs/running-on-device#method-1-using-adb-reverse-recommended) telefon localhost’unu Mac loopback’e taşır:

```sh
adb -d reverse tcp:5080 tcp:5080
adb -d reverse tcp:8081 tcp:8081
```

API ve Android Metro yalnız 127.0.0.1 üzerinde kalır. Test sonrası yalnız bu iki yönlendirme `adb -d reverse --remove tcp:5080` ve `adb -d reverse --remove tcp:8081` ile kaldırılabilir; diğer projelerin bağlantıları topluca silinmez. USB uygulama doğrulaması kapatılmaz; artık gerekmiyorsa USB hata ayıklamayı kullanıcı kapatabilir.

## iPhone geliştirme kurulumu ve ağ sınırı

App Store Türkiye Expo Go 57.0.9 SDK 58 projesini açmadı; SDK düşürülmeden [yerel development build](https://docs.expo.dev/guides/local-app-development/) kullanıldı. `expo-dev-client ~58.0.14`, Expo CNG ve CocoaPods 1.17.0 ile Xcode 27.1 üzerinden imzalı uygulama kuruldu. Kullanıcı Apple hesabı/Team, sözleşme onayı, anahtar zinciri ve Developer Mode işlemlerini kendisi tamamladı. `mobile/ios/` ve kişisel imzalama bilgileri git dışındadır.

`build:ios:device` ve pod kurulumu `EX_DEV_CLIENT_NETWORK_INSPECTOR=false` kullanır; geliştirme ağı yakalayıcısı parola/bearer trafiğini toplamasın diye kapalıdır. TLS doğrulaması kapatılmaz. Native bağımlılıklarda nullability/deprecated API/Swift uyumluluk uyarıları kaldı; gizlenmedi. Derleme exit 0, imza ve fiziksel kurulum ayrıca doğrulandı.

API 127.0.0.1:5080 üzerinde kaldı. Yalnız seçili özel Wi-Fi arayüzünde 5443 TLS geçidi API’ye, 8082 TCP geçidi ayrı localhost Metro 8083’e yönlendirildi. `EXPO_PUBLIC_API_URL=https://<özel-IP>:5443` ve `EXPO_PACKAGER_PROXY_URL=http://<özel-IP>:8082` yalnız geliştirme sürecine verildi; kalıcı IP kaynak koda yazılmadı. API kimlik trafiği HTTPS, geliştirme JS aktarımı HTTP’dir; yalnız güvenilen özel ağ içindir. PostgreSQL/router/firewall/public tunnel ayarları değişmedi.

Geçici CA 7 gün, sunucu sertifikası 2 gün geçerliydi. Kullanıcı yalnız **Bite Routine Temporary Device Test CA** profilini yükleyip güveni açtı ve Safari HTTPS sağlık kontrolünü doğruladı. Özel anahtarlar repo dışında kısıtlı izinlerle tutuldu; güven deposuna otomatik ekleme yapılmadı.

## Test sonu ve kalan işlem

Kabul tamamlandıktan sonra yalnız bu işin iPhone proxy ve Metro süreçleri durduruldu; geçici CA/sunucu anahtarları ve sertifika aktarım klasörü silindi. Mevcut localhost API ve diğer geliştirme süreçleri korundu. Bu nedenle iPhone’daki geçici geliştirme bağlantısı artık çalışmaz.

**Kullanıcı temizliği tamamladı (22 Ekim 2026):** iPhone → Ayarlar → Genel → VPN ve Aygıt Yönetimi → **Bite Routine Temporary Device Test CA** → Profili Sil. Başka profil veya Apple Development sertifikası kaldırılmaz. Yeni bir cihaz testi gerektiğinde HTTPS geliştirme bağlantısı yeniden hazırlanmalıdır.

## Bağımlılık incelemesi

22 Ekim: tam audit **48** bulgu (18 orta, 30 yüksek); `--omit=dev` audit **40** (19 orta, 21 yüksek). Bunlar paket ağacının sonuçlarıdır; iki sayıyı çıkararak “yalnız dev” sayısı üretmeyin. Expo/React Native kendi CLI/Metro ve peer bağımlılıklarını `dependencies` ağacında da taşır: **omit=dev = telefonda çalışan JS** demek değildir.

Üç temel advisory: `braces` 3.0.3 (Metro/Jest dosya kalıplarında derin girdilerle DoS), `node-forge` 1.4.0 (Expo CLI/sertifika araçlarında RSA imza doğrulama), `sprintf-js` 1.0.3 (test/araç metin biçimlemesinde DoS). Hiçbiri yalnız root `devDependencies` sınıfında değildir. Bu hazırlığın Android üretim Metro kaynak haritasındaki 1134 modülde bu üç paketten kaynak bulunmadı. Bu gözlem Expo Go’nun native kodunu, geliştirme paketini veya tüm gelecek dağıtımları güvenli ilan etmez.

Kalan risk Mac’teki araç zincirinde zararlı kalıp/metin/sertifika girdileriyle hizmet kesintisi veya hatalı sertifika doğrulamasıdır. Android loopback + yetkilendirilmiş USB kullandı; iPhone için yalnız seçili özel Wi-Fi arayüzündeki geçici geliştirme geçitleri kullanıldı ve kabul sonunda kapatıldı. CLI/Metro’ya güvenilmeyen kaynak vermeyin; dağıtımdan önce upstream düzeltmelerini ve native/runtime kapsamını yeniden değerlendirin. `npm audit fix --force` kullanılmadı; SDK düşürülmedi ve uyarılar gizlenmedi.
