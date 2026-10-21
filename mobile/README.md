# Bite Routine mobil

Expo + React Native + TypeScript ile salt okunur katalog: Türkçe arama, 10 kayıtlık önceki/sonraki sayfalar ve gıdanın 100 g besin detayı. Krem/yeşil görünüm, güvenli alan, kaydırılabilir arama/listeler ve klavye desteği vardır. Yüklenme, boş sonuç ve tekrar denenebilir bağlantı hataları ayrı gösterilir; eksik besin sıfır sayılmaz. Giriş, günlük, favori ve onboarding bu dilimde yoktur.

## Çalıştırma

Node 24 LTS kullanın. Önce mevcut .NET API ve geliştirme PostgreSQL ortamını [yerel kurulum](../docs/local-setup.md) ile açın; örneğin depo kökünden `node scripts/local-demo.mjs`. Mobil istemci yalnız mevcut `/meals` ve `/meals/{id}` GET uç noktalarını kullanır; DB bağlantısı veya ikinci backend yoktur.

```sh
cd mobile
npm ci
cp .env.example .env
npm run ios
```

`.env` içindeki **EXPO_PUBLIC_API_URL** yalnız API origin adresidir. iOS Simulator için `http://127.0.0.1:5080`; Android Emulator için `http://10.0.2.2:5080`. Fiziksel cihazda localhost telefonun kendisidir: Mac'in erişilebilir LAN adresi ve API'nin o arayüzde dinlemesi gerekir; bu dilimde LAN erişimi açılmadı. EXPO_PUBLIC değişkenleri uygulamaya gömülür, gizli değildir. Parola/DB bağlantısı/token koymayın. Adres değişiminden sonra Expo'yu yeniden başlatın. HTTPS dışı adresler yalnız yerel geliştirme içindir; bu dilimde dağıtım yapılandırılmaz.

Expo Router iki ekranı bağlar; katalog araması ve sayfası geri dönüşte korunur. Yeni arama ilk sayfaya döner; önceki istek iptal edilir, geç yanıt son aramayı ezmez. 12 saniyelik bağlantı zaman aşımı ve manuel “Tekrar dene” vardır; otomatik tekrar yoktur. Detay mevcut API'den kimlikle alınır; kaynak bağlantısı HTTPS olarak açılır.

## Sürümler

16 Ekim 2026 tarihinde [resmî SDK 58 tablosu](https://docs.expo.dev/versions/v58.0.0/) ve resmî npm şablonu doğrulandı: Expo 58.0.12, React Native 0.88.0, React 19.3.0. Node alt sınırı 22.13; projede Node 24 LTS kullanılır. Router, safe-area ve diğer paketler `npx expo install` ile SDK'ya eşlendi; lockfile commitlidir. Yeni paketleri aynı komutla ekleyin. Jest 29.7, kurulan SDK'nın uyumluluk listesidir ve jest-expo 58 paketinin peer aralığındadır; davranış testleri bu gerçek birleşimle geçti.

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

9 test, RN bileşenleri ve API istemcisinde arama/sayfa koruma, detay seçimi, hata/yeniden deneme, boş sonuç, eski yanıt iptali, 100 g/null/sıfır ve zaman aşımını kapsar. CI typecheck/test/lint, SDK paket kontrolü ve iOS Metro JS/assets paketlemesini çalıştırır; native derleme veya simülatör testi değildir. Gerçek yerel API HTTP kontrolü 30 gıdaya erişim, Türkçe YOĞURT araması, detay, boş sonuç ve bağlantı hatasıyla geçti. Backend/web değişmediğinden eski testler yerelde tekrarlanmadı.

`npm audit` kurulu SDK/test araçlarının dolaylı bağımlılıklarında 62 uyarı (12 orta, 50 yüksek; 4 temel advisory) bildiriyor. İzinli güncellemeler uygulandı; kalanlar braces/node-forge/sprintf-js/uuid zincirlerinde. `--force` ile eski SDK/RN sürümüne düşürülmedi veya doğrulama kapatılmadı. SDK uyumlu düzeltme sürümleri çıktığında lockfile güncellenmeli.

## iOS Simulator: kalan manuel kurulum

Bu bilgisayarda yalnız `/Library/Developer/CommandLineTools` var; tam Xcode ve `xcrun simctl` yok. **iOS Simulator’da çalıştırma, native klavye/güvenli alan ve gerçek dokunma akışı henüz doğrulanmadı. Web önizlemesi mobil doğrulama sayılmadı.**

1. macOS sürümünüzle uyumlu tam **Xcode 26.4 veya üzerini** Apple'dan kurun; bir kez açıp lisans/ilk kurulum adımlarını tamamlayın.
2. Xcode → Settings → Components bölümünden bir iOS Simulator runtime'ı kurun; Settings → Locations → Command Line Tools alanında tam Xcode'u seçin. Gerekirse terminalde `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` kullanın.
3. `xcrun simctl list devices available` cihaz göstermeli. API çalışırken `mobile/` içinde `npm run ios` ile uyumlu Expo Go'yu simülatörde açın.
4. Liste, YOĞURT araması, sonraki/önceki sayfa, 100 g detay ve geri dönüşü deneyin. Yalnız kendinizin başlattığı API'yi durdurup hata/“Tekrar dene” akışını da doğrulayın; küçük ekranda klavye açıkken arama düğmesi ve listeye ulaşımı kontrol edin.

[Resmî Simulator kurulumu](https://docs.expo.dev/workflow/ios-simulator/). Kurulum sonrası bu native doğrulama, yeni özellik eklemeden sıradaki iştir. Cloud build, yayın veya deployment yapılmadı.
