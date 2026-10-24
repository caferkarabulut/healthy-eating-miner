# Bite Routine mobil

Expo + React Native + TypeScript ile salt okunur katalog: Türkçe arama, 10 kayıtlık önceki/sonraki sayfalar ve gıdanın 100 g besin detayı. Krem/yeşil görünüm, güvenli alan, kaydırılabilir arama/listeler ve klavye desteği vardır. Yüklenme, boş sonuç ve tekrar denenebilir bağlantı hataları ayrı gösterilir; eksik besin sıfır sayılmaz. Kayıt, giriş, hesap ve bu cihazdan çıkış ekranları da vardır. Günlük listeleme/ekleme, düzenleme ve silme de vardır; favori ekleme/çıkarma ve kişisel favoriler ekranı vardır; geçmiş ve onboarding mobil kapsamda değildir.

## Çalıştırma

Node 24 LTS kullanın. Önce mevcut .NET API ve geliştirme PostgreSQL ortamını [yerel kurulum](../docs/local-setup.md) ile açın; örneğin depo kökünden `node scripts/local-demo.mjs`. Mobil istemci mevcut katalog ve Identity bearer API’sini kullanır; DB bağlantısı veya ikinci backend yoktur. [Mobil oturum sözleşmesi ve doğrulama](docs/session.md).

```sh
cd mobile
npm ci
cp .env.example .env
npm run ios -- --localhost
```

`.env` içindeki **EXPO_PUBLIC_API_URL** yalnız API origin adresidir. iOS Simulator için `http://127.0.0.1:5080`; Android Emulator için `http://10.0.2.2:5080`. Fiziksel cihazda localhost telefonun kendisidir: Android’de USB reverse veya iPhone’da localhost API’ye dar bir geliştirme geçidi gerekir; cihaz kurulumu aşağıda belgelenir. EXPO_PUBLIC değişkenleri uygulamaya gömülür, gizli değildir. Parola/DB bağlantısı/token koymayın. Adres değişiminden sonra Expo'yu yeniden başlatın. HTTPS dışı adresler yalnız yerel geliştirme içindir; bu dilimde dağıtım yapılandırılmaz.

Expo Router katalog, detay ve oturum ekranlarını bağlar; katalog araması ve sayfası geri dönüşte korunur. Yeni arama ilk sayfaya döner; önceki istek iptal edilir, geç yanıt son aramayı ezmez. 12 saniyelik bağlantı zaman aşımı ve manuel “Tekrar dene” vardır; otomatik tekrar yoktur. Detay mevcut API'den kimlikle alınır; kaynak bağlantısı HTTPS olarak açılır.

## Sürümler

16 Ekim 2026 tarihinde [resmî SDK 58 tablosu](https://docs.expo.dev/versions/v58.0.0/) ve resmî npm şablonu doğrulandı: Expo 58 (ilk teslim 58.0.12; 22 Ekim uyumluluk güncellemesi 58.0.17), React Native 0.88.0, React 19.3.0. Node alt sınırı 22.13; projede Node 24 LTS kullanılır. Router, safe-area ve diğer paketler `npx expo install` ile SDK'ya eşlendi; lockfile commitlidir. Yeni paketleri aynı komutla ekleyin. 22 Ekim çevrimiçi uyumluluk kontrolüne göre Jest 30.5.2 / jest-expo 58.0.12 ve Router 58.0.25 eşleştirildi; davranış testleri bu birleşimle geçti.

## Kontroller

```sh
npm run typecheck
npm test
npm run lint
npm run check:deps
npm run export:ios
# Çalışan, kaynaklı geliştirme kataloğuna salt okunur HTTP kontrolü:
EXPO_PUBLIC_API_URL=http://127.0.0.1:5080 npm run smoke:api
```

71 test, günlük düzenleme/silme ve oturum yenileme/yarış durumları, kayıt formunu düzeltip yeniden gönderme ve RN bileşenleri/API istemcisinde arama/sayfa koruma, detay seçimi, hata/yeniden deneme, boş sonuç, eski yanıt iptali, 100 g/null/sıfır ve zaman aşımını kapsar. CI typecheck/test/lint, SDK paket kontrolü ve iOS/Android Metro JS/assets paketlemesini çalıştırır; native derleme veya simülatör testi değildir. Gerçek yerel API HTTP kontrolü 30 gıdaya erişim, Türkçe YOĞURT araması, detay, boş sonuç ve bağlantı hatasıyla geçti. Backend/web değişmediğinden eski testler yerelde tekrarlanmadı.

24 Ekim `npm audit`: **5 yüksek**, kritik yok. Bulgular Expo CLI/code-signing/node-forge/zod araç zincirindedir; Expo'nun dependency ağında görünmeleri native uygulamada çalıştıkları anlamına gelmez. Native oturum kodu bunları token üretmek/doğrulamak için kullanmaz. Geliştirme sunucusu yalnız test süresince açık tutulur; dağıtım öncesi yeniden değerlendirilir. Önerilen zorlayıcı eski SDK'ya geçiş uygulanmadı (`audit fix --force` yok). Önceki runtime/dev incelemesi: [cihaz notları](docs/device-validation.md#bağımlılık-incelemesi).

## iOS Simulator

Tam Xcode ve bir iOS runtime’ı gerekir ([resmî kurulum](https://docs.expo.dev/workflow/ios-simulator/)). Xcode seçimini `xcode-select -p`, cihazları `xcrun simctl list devices available` ile kontrol edin. Bu ortamda Xcode 27.1 / iOS 27.1 iPhone Duo ve SDK 58 uyumlu Expo Go kullanıldı. SecureStore bu SDK’nın Expo Go paketine dahildir; bu modül için ek native derleme gerekmedi.

Yerel Expo adresi açılmıyorsa Node’un IPv6 localhost seçimi yerine şu komutu kullanın:

```sh
NODE_OPTIONS=--dns-result-order=ipv4first npm run ios -- --localhost
```

Kullanıcı, Simulator’da katalog listeleme, Türkçe arama, detay, geri dönüş, sayfalama ve boş sonucu doğruladı. Mobil oturum diliminde gerçek API ile kayıt/hata düzeltme/giriş, hesap, tam kapatıp açma sonrası SecureStore’dan geri yükleme, çıkış ve geçersiz oturum temizliği ayrıca native ekranda denendi. Yazılım klavyesi açıkken giriş ve gezinme kontrol edildi; web önizlemesi native doğrulama sayılmadı.

Gerçek cihaz hazırlığı: [Android USB kurulumu ve cihaz kabul listesi](docs/device-validation.md). Önce Android, ardından iPhone. API localhost’ta kalır; Android’de yalnız API/Metro portları ADB reverse ile taşınır. Galaxy A72 / Android 14 ve iPhone 13 / iOS 26.6.1 kabul listeleri kullanıcı doğrulamasıyla tamamlandı; iPhone yerel development build kullandı. Paketleme/Simulator ve gerçek cihaz sonuçları ayrı kaydedilir.

## Gerçek iPhone: yerel development build

App Store Türkiye’de kontrol edilen Expo Go 57.0.9, projenin SDK 58 sürümünü açmadı. Android’de resmî Expo Go 58.0.5 ile kabul tamamlandı; iPhone’da SDK düşürmek yerine SDK uyumlu `expo-dev-client` 58.0.14 ve yerel Xcode development build kullanılır. Cloud build veya mağazaya gönderim yoktur.

```sh
# mobile/ içinde; tam Xcode, CocoaPods, bağlı/yetkilendirilmiş iPhone
npm run build:ios:device
# Derleme kurulduktan sonra, aynı cihaz API ortamıyla:
npm run start:dev -- --localhost
```

`build:ios:device` gerektiğinde Expo CNG ile git dışında kalan `ios/` klasörünü üretir. Apple hesabı, geliştirme sertifikası ve telefonun Developer Mode/imzalama adımları Xcode’da kullanıcı tarafından tamamlanır; kişisel Team ID, sertifika, provisioning profile veya özel anahtar commit edilmez. Native dosyalar elle oluşturulmaz. `npm start`, `npm run android` ve `npm run ios`, mevcut Expo Go akışını korumak için açıkça `--go` kullanır. Ayrı geliştirme istemcisi için `start:dev` kullanın. [Gerçek cihaz durumu ve HTTPS geçidi](docs/device-validation.md).

Yerel iPhone build komutu `EX_DEV_CLIENT_NETWORK_INSPECTOR=false` kullanır; Expo development client ağ yakalayıcısı login parolası/bearer trafiğini toplamasın diye kapatılır. Pod kurulumu da aynı ortamla yapılır. Bu ayar ağ/TLS doğrulamasını kapatmaz; yalnız geliştirme aracının istek yakalamasını engeller.

## Mobil günlük

Günlüğüm seçilen günün kayıtlarını, öğünlerini ve API toplamlarını gösterir. Gıda detayından gram veya kaynaklı ölçü/adetle ekleme, gün/öğün seçimi vardır; oturum gerekir. [Davranış, doğrulama ve iPhone/Samsung kabul listesi](docs/diary.md). Düzenleme/silme için [ölçü kopyası kuralları, testler ve kabul listesi](docs/diary-edit.md). Favorilerden mevcut gram/adet formuna geçiş için [mobil favori sözleşmesi ve kabul listesi](docs/favorites.md). Geçmiş mobil kapsamda yoktur.

## Ücretsiz telefon testi

Depo kökünden `node scripts/mobile-test.mjs`. [QR, yeniden giriş ve güvenli kapatma](../docs/mobile-local-test.md).
24 Ekim SDK uyumluluk kontrolüyle Expo 58.0.19, dev-client 58.0.15 ve Router 58.0.26 eşlendi;
yeni native modül eklenmedi. Fiziksel cihaz kabulü paketlemeden ayrı kaydedilir.
