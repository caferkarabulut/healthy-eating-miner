# Gerçek cihaz doğrulaması — PR #25

22 Ekim 2026. Android önce, iPhone sonra. Yeni özellik, backend değişikliği, migration veya deployment yoktur.

## Hazırlık ve seçim

İncelenen uygulama HEAD’i `40a34b3549ba709df02fafdf06da43330e339a77`; aynı HEAD’in mobil CI’ı başarılı. Başlangıç çalışma ağacı temizdi. Token saklama/yenileme/çıkış incelemesinde yeni engel bulunmadı. [Oturum sözleşmesi](session.md): opak Identity bearer, tek eşzamanlı refresh, ağ/5xx hatasında saklanan oturumu koruma, başlangıç/ön plan `/me` kontrolü ve çıkıştan sonra geciken yanıt/yazmayı reddetme. Çıkış yalnız cihaz tokenlarını siler; sunucuda bearer iptali sağlamaz.

Android ilk cihaz kabulü için **Expo Go / SDK 58** seçildi. iPhone’da App Store sürümü SDK 58’i desteklemediğinden aşağıdaki development build yoluna geçildi. Kullanılan native modüller, özellikle [SecureStore](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/), Expo Go’da vardır; özel native modül veya biyometrik zorunluluk yoktur. Android kabulünde development build gerekmedi; iPhone’da App Store uyumsuzluğu nedeniyle yerel Xcode imzalaması gerekiyor. Kendi paketinin native yapılandırmasını veya dağıtım davranışını doğrulamak gerektiğinde development build ayrıca ele alınır. Expo Go kabulü bağımsız uygulama paketinin kabulü değildir.

Mac: Node 24.18.0, seçili tam Xcode, daha önce kullanılan iOS 27.1 Simulator; Android Studio/SDK yoktu. USB testi için yalnız resmî Android Platform Tools 37.0.1 Homebrew ile kuruldu (`adb` 1.0.41). Android Studio, JDK/Gradle veya emulator kurulmadı. İlk `adb devices -l` listesi boş; fiziksel iPhone da Xcode cihaz listesinde yok. Kullanıcı cihazı Samsung Galaxy A72 / Android 14 / One UI 6.1 olarak bildirdi; bu bilgi kullanıcı beyanıdır. USB yetkilendirmesi tamamlandı: ADB `device`, ana Android profili 0. ADB model SM-A725F ve Android 14 bilgisini doğruladı. API/Metro için yalnız 5080/8081 USB reverse uygulandı; Expo Go proje URL’sini açma isteği gönderildi. İlk Expo Go sürümü ADB ile 57.0.9 bulundu. SDK 58 için Expo CLI’ın resmî sürüm hizmeti 58.0.5 ve expo/expo-go-releases indirmesini gösterdi; `adb install --user 0 -r` ile mevcut Expo Go kaldırılmadan güncelleme başarılı oldu; ADB 58.0.5 sürümünü doğruladı. Kullanıcı katalog/arama/detay/geri dönüş ve kayıt hata düzeltme akışlarını doğruladı; diğer adımlar bekleniyor.

## Android: en dar bağlantı USB

Telefonun `localhost` adresi normalde telefonun kendisidir. [ADB reverse](https://reactnative.dev/docs/running-on-device#method-1-using-adb-reverse-recommended), yalnız seçilen Android’in iki portunu Mac’in loopback portlarına USB üzerinden taşır:

- API: telefon `127.0.0.1:5080` → Mac `127.0.0.1:5080`.
- Metro: telefon `127.0.0.1:8081` → Mac `127.0.0.1:8081`.

API ve Metro hâlen yalnız `127.0.0.1` üzerinde dinliyor; hazır olma kontrolleri başarılı. API’nin kalıcı localhost ayarları, PostgreSQL dinleme/kimlik ayarları ve firewall değiştirilmez. Wi‑Fi portu, `0.0.0.0`, tünel servisi veya router port yönlendirmesi açılmaz. Mac IP’si kaynak koda yazılmaz. `EXPO_PUBLIC_API_URL` gizli olmayan bir origin’dir; bu USB düzeninde mevcut `http://127.0.0.1:5080` korunur. HTTP yalnız USB/loopback geliştirme kontrolü içindir; LAN üzerinden parola/token gönderme ayarı değildir.

### Kullanıcı: önce yalnız Android

1. **Play Store → Expo Go (Expo)** uygulamasını kurun/güncelleyin. SDK 58 uyumunu açılışta kontrol edeceğiz. Sürüm hatası varsa uyarıyı aynen paylaşın; rastgele APK kurmayın.
2. **Ayarlar → Telefon hakkında / Yazılım bilgileri** içinden model ve Android sürümünü bildirin. Aynı bölümde genellikle **Yapım numarası** satırına yedi kez dokunmak Geliştirici seçeneklerini açar; üreticiye göre konum değişir.
3. **Ayarlar → Geliştirici seçenekleri → USB hata ayıklama** açın. Veri taşıyan kabloyla Mac’e bağlayın, kilidi açın. Telefonda bu Mac’in RSA izni sorulursa bu oturum için onaylayın; her bilgisayara kalıcı güven seçmeyin. Beklenen: `adb devices -l` durumunda `device`. `unauthorized` izin bekler; boş liste kablo/USB bağlantısını işaret eder. Kablosuz hata ayıklama, OEM kilidi veya bootloader açma gerekmiyor.
4. Telefon görüldükten sonra Mac’te aşağıdaki komutları çalıştıracağız. `-d` yalnız tek USB cihazı seçer; birden fazla fiziksel Android varsa durup doğru cihazı seçeriz. USB bağlantısı yokken bu adım tamamlanmış sayılmaz.

```sh
adb -d reverse tcp:5080 tcp:5080
adb -d reverse tcp:8081 tcp:8081
adb -d reverse --list
```

5. Android’de **Chrome → adres çubuğu → `http://127.0.0.1:5080/health/live`**. Beklenen: Bite Routine için `status: ok`. Bu kontrol başarı olmadan giriş bilgisi göndermeyin.
6. Mevcut localhost Metro kullanılabilir. Kapalıysa `mobile/` içinde aşağıdaki komutu çalıştırın; port doluysa mevcut süreci öldürmeyin, önce inceleyin:

```sh
NODE_OPTIONS=--dns-result-order=ipv4first EXPO_PUBLIC_API_URL=http://127.0.0.1:5080 npm start -- --localhost
```

7. **Expo Go → Enter URL manually** seçeneği varsa `exp://127.0.0.1:8081` girin. Seçenek yoksa Mac’ten yalnız bu URL açılabilir:

```sh
adb -d shell am start -a android.intent.action.VIEW -d exp://127.0.0.1:8081
```

Beklenen: Bite Routine katalog listesi; ardından aşağıdaki kabul listesi. Telefonda bir izin veya sürüm hatası çıkarsa önce onu çözeriz; iPhone adımlarına henüz geçmeyiz.

Test sonunda sadece bu iki ters yönlendirmeyi kaldırın; başka projelerin bağlantılarını topluca silmeyin. İsterseniz USB hata ayıklamayı kapatın:

```sh
adb -d reverse --remove tcp:5080
adb -d reverse --remove tcp:8081
```

## Cihaz kabul listesi

Her satır için cihaz modeli, işletim sistemi, Expo Go sürümü, uygulama HEAD’i, tarih, sonucu ve doğrulayanı kaydedin. Parola/token, cihaz seri numarası veya gerçek e-posta kaydetmeyin. Kullanıcının bildirdiği sonuç **kullanıcı doğrulaması** olarak yazılır; gözlemlenmeyen adımlar geçilmiş sayılmaz. Yalnız test için kullanılan bir hesap seçin; temizlikte başka kullanıcıya dokunmayın.

| Kontrol | Beklenen sonuç | Android | iPhone |
| --- | --- | --- | --- |
| Katalog / Türkçe arama / detay / geri | Oturumsuz erişim; doğru detay ve arama | Başarılı — kullanıcı doğrulaması (22 Ekim 2026) | Bekliyor |
| Zayıf parola → düzelt → tekrar kayıt | Türkçe alan hatası temizlenir; yenilemeden başarı; açık giriş bağlantısı | Başarılı — kullanıcı doğrulaması (22 Ekim 2026) | Bekliyor |
| Yanlış şifre → düzelt → giriş / hesap | Güvenli hata; düzeltince temizlenir; hesap açılır | Başarılı — kullanıcı doğrulaması (22 Ekim 2026) | Bekliyor |
| Tam kapat / aç | Expo Go’yu son uygulamalardan tamamen kapatıp açınca oturum `/me` ile gelir; USB bağlı kalır | Başarılı — kullanıcı doğrulaması (22 Ekim 2026) | Bekliyor |
| Arka plan / geri dön | Ana ekrana gidip geri gelince hesap yeniden doğrulanır; form kullanılabilir | Başarılı — kullanıcı doğrulaması (22 Ekim 2026) | Bekliyor |
| Ağ kesintisi / geri gelme | Oturum silinmez; anlaşılır hata; bağlantı gelince yeniden deneme çalışır | Başarılı — kullanıcı doğrulaması (22 Ekim 2026): kesintide oturum korunur; reverse yeniden kurulup Hesabı yenile ile giriş gerektirmeden toparlandı | Bekliyor |
| Çıkış / tam kapat / aç | Hesap tekrar giriş ister; katalog açık kalır | Başarılı — kullanıcı doğrulaması (22 Ekim 2026) | Bekliyor |

**USB’de ağ kesintisi testi:** Wi‑Fi/mobil veriyi kapatmak USB bağlantısını kesmez. Uygulama açık ve yüklüyken USB’yi çıkarın; uygulamayı yeniden yüklemeden Hesabı yenile’ye basın. En geç yaklaşık 12 saniyede bağlantı hatası görünmeli, oturum silinmemeli. Kabloyu geri takıp iki `adb reverse` komutunu tekrar uygulayın; Hesabı yenile ile düzelmeli. Metro da USB kullandığından kablo yokken soğuk açılışın JS paketini yükleyememesi, tokenın silindiğini göstermez. Bu iki durumu ayrı kaydedin.

## Sonuçları ayırma

| Kanıt | Ortam | Sonuç |
| --- | --- | --- |
| Kullanıcı doğrulaması | iPhone Duo **Simulator**, iOS 27.1 | Liste, Türkçe arama, detay, geri dönüş, sayfalama, boş sonuç başarılı (önceki kullanıcı bildirimi) |
| Agent native kontrolü | Aynı Simulator / Expo Go | Kayıt/düzeltme, giriş/hesap, SecureStore yeniden açılış, çıkış, geçersiz refresh ve klavye önceki oturumda doğrulandı; bu hazırlıkta tekrar sayılmadı |
| Otomatik test | Node 24; bu hazırlık | 29 test, TypeScript ve lint başarılı; yarış/ağ/geri yükleme/çıkış testleri dahil |
| Paketleme | Android Metro JS/assets, bu hazırlık | Başarılı; APK/native build veya gerçek cihaz testi değildir |
| Paketleme | iOS Metro JS/assets, önceki CI | Başarılı; Simulator veya gerçek cihaz testi değildir |
| Gerçek Android | Samsung Galaxy A72 / Android 14 / One UI 6.1 (kullanıcı beyanı); Expo Go ilk kurulum 57.0.9; SDK 58 uyumlu 58.0.5 sürümüne veriler silinmeden güncellendi | USB/ADB ve iki reverse hazır; Expo Go proje açma isteği gönderildi. Katalog/YOĞURT arama/detay/geri dönüş ve zayıf parolayı düzeltip yenilemeden kayıt başarılı: **kullanıcı doğrulaması**, 22 Ekim 2026, uygulama kodu 40a34b3 (PR belge HEAD’i 7581a2c). Yanlış şifre/doğru giriş, tam kapatıp açmada oturum ve arka plandan dönüş de kullanıcı tarafından doğrulandı. USB kesilince “Bağlantı kurulamadı. Oturumunuz silinmedi; yeniden deneyin” mesajı kullanıcı tarafından doğrulandı. Yeniden takınca ADB yetkiliydi fakat reverse listesi boştu; iki yönlendirme yeniden kuruldu. Kullanıcı Hesabı yenile sonrası hatanın kalktığını ve yeniden giriş gerekmediğini doğruladı. Çıkış/tam yeniden açılışta hesap giriş isterken kataloğun açık kaldığı da kullanıcı tarafından doğrulandı; Android kabul listesinin tamamı geçti |
| Gerçek iPhone | iPhone 13 / iOS 26.6.1 (kullanıcı beyanı), aynı özel Wi-Fi; Expo Go sürümü bekleniyor | API HTTPS ve ayrı Metro geçidi Mac’te doğrulandı; Geçici CA profili yükleme ve sertifika güvenini açma kullanıcı tarafından doğrulandı; Safari HTTPS sağlık kontrolünde status ok kullanıcı tarafından doğrulandı; Expo Go açılışı SDK uyumsuzluğu nedeniyle engellendi; yerel development build ve uygulama kabul adımları bekliyor |

## Bağımlılık incelemesi

22 Ekim: tam audit **48** bulgu (18 orta, 30 yüksek); `--omit=dev` audit **40** (19 orta, 21 yüksek). Bunlar paket ağacının sonuçlarıdır; iki sayıyı çıkararak “yalnız dev” sayısı üretmeyin. Expo/React Native kendi CLI/Metro ve peer bağımlılıklarını `dependencies` ağacında da taşır: **omit=dev = telefonda çalışan JS** demek değildir.

Üç temel advisory: `braces` 3.0.3 (Metro/Jest dosya kalıplarında derin girdilerle DoS), `node-forge` 1.4.0 (Expo CLI/sertifika araçlarında RSA imza doğrulama), `sprintf-js` 1.0.3 (test/araç metin biçimlemesinde DoS). Hiçbiri yalnız root `devDependencies` sınıfında değildir. Bu hazırlığın Android üretim Metro kaynak haritasındaki 1134 modülde bu üç paketten kaynak bulunmadı. Bu gözlem Expo Go’nun native kodunu, geliştirme paketini veya tüm gelecek dağıtımları güvenli ilan etmez.

Kalan risk Mac’teki araç zincirinde zararlı kalıp/metin/sertifika girdileriyle hizmet kesintisi veya hatalı sertifika doğrulamasıdır. Loopback + yetkilendirilmiş USB ile sınırlı kabul testinde yeni ağ erişimi açılmadı. CLI/Metro’ya güvenilmeyen kaynak vermeyin; dağıtımdan önce upstream düzeltmelerini ve native/runtime kapsamını yeniden değerlendirin. `npm audit fix --force` kullanılmadı; SDK düşürülmedi ve uyarılar gizlenmedi.

## iPhone hazırlığı

Android kabulü tamamlandı; kullanıcı iPhone 13 / iOS 26.6.1 ve aynı özel Wi-Fi bilgisini verdi. Cihaz bilgisi kullanıcı beyanıdır; native iPhone testi henüz yapılmadı.

Android çalışmadan ikinci cihazın ayarları başlatılmaz. Android kabulü sonrası iPhone modeli/iOS/Expo Go sürümü ve Mac ile bağlantı şekli alınır. iPhone’da Android’in `adb reverse` yöntemi yoktur; telefondaki localhost Mac değildir. Gerekirse mevcut localhost API’sini koruyan, yalnız seçili özel arayüzde dinleyen geliştirme geçidi ve token/parola için HTTPS değerlendirilir; sertifika/yerel ağ izni adımları cihaz bilgisiyle açıkça verilir. Artık aşağıdaki geçici geliştirme geçitleri yalnız seçili özel arayüzde hazır; sertifika güveni kullanıcıdan beklenir. Public tunnel veya PostgreSQL ağ erişimi açılmadı.

### Hazırlanan geçit (geçici, repo dışında)

API 127.0.0.1:5080 üzerinde kalır. Yalnız seçili özel Wi-Fi IPv4 adresinde 5443 TLS geçidi API’ye, 8082 TCP geçidi ayrı localhost Metro 8083’e gider. Android’in localhost Metro 8081 süreci korunur. LAN IP’si kaynak koda veya kalıcı ayara yazılmaz; `EXPO_PUBLIC_API_URL=https://<özel-IP>:5443` ve `EXPO_PACKAGER_PROXY_URL=http://<özel-IP>:8082` yalnız iPhone Metro sürecine verilir. Yerel ağdaki geliştirme paketi HTTP’dir; yalnız güvenilen özel ağda kullanılmalıdır. Kimlik bilgileri API’ye HTTPS ile gider. Veritabanı/firewall/router/public tunnel ayarı değişmedi.

OpenSSL ile oluşturulan CA 7 gün, API sunucu sertifikası 2 gün geçerlidir. Anahtarlar yalnız izinleri kısıtlı `/private/tmp/bite-routine-iphone-tls` klasöründe; Mac/iPhone güven deposuna otomatik ekleme yoktur. Yalnız herkese açık CA kopyası `/private/tmp/bite-routine-iphone-certificate/Bite-Routine-Device-Test.cer` içinde AirDrop için ayrıldı. Kök sertifika adı **Bite Routine Temporary Device Test CA**. Bu CA’ya güven verilmesi, anahtarının imzaladığı sertifikalara cihazın güvenmesi demektir; anahtar paylaşılmaz ve test bitince profil/güven kaldırılır.

Mac’te CA doğrulaması açık HTTPS `/health/live` 200; iOS manifestinin özel geçit adresini ve gerçek geliştirme JS’inin HTTPS API origin’ini taşıdığı doğrulandı. Bunlar iPhone cihaz kabulü değildir. Kullanıcı önce App Store’dan SDK 58 uyumlu Expo Go’yu kurar, yalnız `.cer` dosyasını AirDrop ile alır, profil adı doğrulanarak yükler; ardından Ayarlar → Genel → Hakkında → Sertifika Güven Ayarları’nda yalnız bu geçici CA’ya güven verir ([Apple yönergesi](https://support.apple.com/en-us/102390)). Sonra Safari’de HTTPS sağlık kontrolü, Expo Go için yerel ağ izni ve katalog kabulü sırayla yapılır. Sertifika uyarısı atlanmaz.

Mevcut süreçler: iPhone proxy ve ayrı Metro kendi exec oturumlarında çalışır; durdururken yalnız bu süreçler SIGINT ile kapatılır, başka süreçler öldürülmez. Test bitince iPhone Ayarlar → Genel → VPN ve Aygıt Yönetimi’nden yalnız bu sertifika profili kaldırılır; geçitler durdurulur ve geçici özel anahtarlar silinir. Güncel adrese dönülecekse localhost API origin’inin SecureStore origin ayrımı nedeniyle tekrar giriş isteyebileceği dikkate alınır.

Kullanıcı güncellemesi (22 Ekim 2026): iPhone’da profil önce yüklenmemişti; Yükle tamamlandıktan sonra geçici CA için güven anahtarı göründü ve kullanıcı açtığını bildirdi. Bu yalnız kurulum kullanıcı doğrulamasıdır; API bağlantısı veya uygulama akışları henüz geçti sayılmaz.

Kullanıcı doğrulaması (22 Ekim 2026, iPhone 13 / iOS 26.6.1): Safari’de HTTPS `/health/live` adresinde `status: ok` görüldü. Sırada Expo Go açılışı ve uygulama akışları var.

### iPhone Expo Go engeli ve yerel development build

Kullanıcının ekran görüntüsü “Project is incompatible with this version of Expo Go / requires a newer version” hatasını gösterdi. Manifest SDK 58.0.0 ile doğruydu. [App Store Türkiye](https://apps.apple.com/tr/app/expo-go/id982107779) sürümü 57.0.9 gösterdi; yalnız güncelleme istemek bu engeli çözmüyor. iPhone Expo Go uyumu hazırlık başında doğrulanmalıydı. SDK düşürülmedi.

[Resmî yerel derleme yolu](https://docs.expo.dev/guides/local-app-development/) için `expo install expo-dev-client` ile ~58.0.14 eklendi; config eklentisi açıkça tanımlandı. Android/Simulator Expo Go scriptleri `--go` ile korundu; `start:dev` ve `build:ios:device` ayrı komutlardır. Expo CNG `ios/` projesini üretti; native klasör git dışında. CocoaPods 1.17.0 kuruldu, pod install tamamlandı. 29 test, TypeScript/lint, SDK uyumu ve iOS Metro paketlemesi geçti. Bunlar fiziksel iPhone native derleme/kabul sonucu değildir.

Kullanıcı iPhone’u USB ile bağlayıp Mac’e güven verdi; Xcode cihazı iPhone 13 / iOS 26.6.1 olarak gördü. Kullanıcı Xcode Apple hesabını eklediğini bildirdi. Henüz kullanılabilir kod imzalama kimliği yok; kişisel Team seçimi/geliştirme sertifikası ve Developer Mode adımları kullanıcı tarafından tamamlanmalı. Cihaz/sistem/parola bilgileri commit edilmez. Workspace hazır: `mobile/ios/BiteRoutine.xcworkspace`. İmzalı gerçek cihaz derlemesi ve uygulama kabulü henüz bekliyor.

Yerel iPhone build komutu `EX_DEV_CLIENT_NETWORK_INSPECTOR=false` kullanır; Expo development client ağ yakalayıcısı login parolası/bearer trafiğini toplamasın diye kapatılır. Pod kurulumu da aynı ortamla yapılır. Bu ayar ağ/TLS doğrulamasını kapatmaz; yalnız geliştirme aracının istek yakalamasını engeller.
