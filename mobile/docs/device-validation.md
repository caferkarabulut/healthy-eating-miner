# Gerçek cihaz doğrulaması — PR #25

22 Ekim 2026. Android önce, iPhone sonra. Yeni özellik, backend değişikliği, migration veya deployment yoktur.

## Hazırlık ve seçim

İncelenen uygulama HEAD’i `40a34b3549ba709df02fafdf06da43330e339a77`; aynı HEAD’in mobil CI’ı başarılı. Başlangıç çalışma ağacı temizdi. Token saklama/yenileme/çıkış incelemesinde yeni engel bulunmadı. [Oturum sözleşmesi](session.md): opak Identity bearer, tek eşzamanlı refresh, ağ/5xx hatasında saklanan oturumu koruma, başlangıç/ön plan `/me` kontrolü ve çıkıştan sonra geciken yanıt/yazmayı reddetme. Çıkış yalnız cihaz tokenlarını siler; sunucuda bearer iptali sağlamaz.

İlk cihaz kabulü için **Expo Go / SDK 58** seçildi. Kullanılan native modüller, özellikle [SecureStore](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/), Expo Go’da vardır; özel native modül veya biyometrik zorunluluk yoktur. Development build bu kontrol için gereksiz SDK/Gradle/imzalama kurulumu getirir. Kendi paketinin native yapılandırmasını veya dağıtım davranışını doğrulamak gerektiğinde development build ayrıca ele alınır. Expo Go kabulü bağımsız uygulama paketinin kabulü değildir.

Mac: Node 24.18.0, seçili tam Xcode, daha önce kullanılan iOS 27.1 Simulator; Android Studio/SDK yoktu. USB testi için yalnız resmî Android Platform Tools 37.0.1 Homebrew ile kuruldu (`adb` 1.0.41). Android Studio, JDK/Gradle veya emulator kurulmadı. İlk `adb devices -l` listesi boş; fiziksel iPhone da Xcode cihaz listesinde yok. Android model/sürüm ve USB bağlantısı kullanıcıdan bekleniyor.

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
| Katalog / Türkçe arama / detay / geri | Oturumsuz erişim; doğru detay ve arama | Bekliyor | Android sonrası |
| Zayıf parola → düzelt → tekrar kayıt | Türkçe alan hatası temizlenir; yenilemeden başarı; açık giriş bağlantısı | Bekliyor | Android sonrası |
| Yanlış şifre → düzelt → giriş / hesap | Güvenli hata; düzeltince temizlenir; hesap açılır | Bekliyor | Android sonrası |
| Tam kapat / aç | Expo Go’yu son uygulamalardan tamamen kapatıp açınca oturum `/me` ile gelir; USB bağlı kalır | Bekliyor | Android sonrası |
| Arka plan / geri dön | Ana ekrana gidip geri gelince hesap yeniden doğrulanır; form kullanılabilir | Bekliyor | Android sonrası |
| Ağ kesintisi / geri gelme | Oturum silinmez; anlaşılır hata; bağlantı gelince yeniden deneme çalışır | Bekliyor | Android sonrası |
| Çıkış / tam kapat / aç | Hesap tekrar giriş ister; katalog açık kalır | Bekliyor | Android sonrası |

**USB’de ağ kesintisi testi:** Wi‑Fi/mobil veriyi kapatmak USB bağlantısını kesmez. Uygulama açık ve yüklüyken USB’yi çıkarın; uygulamayı yeniden yüklemeden Hesabı yenile’ye basın. En geç yaklaşık 12 saniyede bağlantı hatası görünmeli, oturum silinmemeli. Kabloyu geri takıp iki `adb reverse` komutunu tekrar uygulayın; Hesabı yenile ile düzelmeli. Metro da USB kullandığından kablo yokken soğuk açılışın JS paketini yükleyememesi, tokenın silindiğini göstermez. Bu iki durumu ayrı kaydedin.

## Sonuçları ayırma

| Kanıt | Ortam | Sonuç |
| --- | --- | --- |
| Kullanıcı doğrulaması | iPhone Duo **Simulator**, iOS 27.1 | Liste, Türkçe arama, detay, geri dönüş, sayfalama, boş sonuç başarılı (önceki kullanıcı bildirimi) |
| Agent native kontrolü | Aynı Simulator / Expo Go | Kayıt/düzeltme, giriş/hesap, SecureStore yeniden açılış, çıkış, geçersiz refresh ve klavye önceki oturumda doğrulandı; bu hazırlıkta tekrar sayılmadı |
| Otomatik test | Node 24; bu hazırlık | 29 test, TypeScript ve lint başarılı; yarış/ağ/geri yükleme/çıkış testleri dahil |
| Paketleme | Android Metro JS/assets, bu hazırlık | Başarılı; APK/native build veya gerçek cihaz testi değildir |
| Paketleme | iOS Metro JS/assets, önceki CI | Başarılı; Simulator veya gerçek cihaz testi değildir |
| Gerçek Android | Model / sürüm / Expo Go: henüz bilinmiyor | Bağlantı ve tüm kabul adımları **bekliyor** |
| Gerçek iPhone | Model / iOS / Expo Go: henüz bilinmiyor | **Android tamamlandıktan sonra** hazırlanacak |

## Bağımlılık incelemesi

22 Ekim: tam audit **48** bulgu (18 orta, 30 yüksek); `--omit=dev` audit **40** (19 orta, 21 yüksek). Bunlar paket ağacının sonuçlarıdır; iki sayıyı çıkararak “yalnız dev” sayısı üretmeyin. Expo/React Native kendi CLI/Metro ve peer bağımlılıklarını `dependencies` ağacında da taşır: **omit=dev = telefonda çalışan JS** demek değildir.

Üç temel advisory: `braces` 3.0.3 (Metro/Jest dosya kalıplarında derin girdilerle DoS), `node-forge` 1.4.0 (Expo CLI/sertifika araçlarında RSA imza doğrulama), `sprintf-js` 1.0.3 (test/araç metin biçimlemesinde DoS). Hiçbiri yalnız root `devDependencies` sınıfında değildir. Bu hazırlığın Android üretim Metro kaynak haritasındaki 1134 modülde bu üç paketten kaynak bulunmadı. Bu gözlem Expo Go’nun native kodunu, geliştirme paketini veya tüm gelecek dağıtımları güvenli ilan etmez.

Kalan risk Mac’teki araç zincirinde zararlı kalıp/metin/sertifika girdileriyle hizmet kesintisi veya hatalı sertifika doğrulamasıdır. Loopback + yetkilendirilmiş USB ile sınırlı kabul testinde yeni ağ erişimi açılmadı. CLI/Metro’ya güvenilmeyen kaynak vermeyin; dağıtımdan önce upstream düzeltmelerini ve native/runtime kapsamını yeniden değerlendirin. `npm audit fix --force` kullanılmadı; SDK düşürülmedi ve uyarılar gizlenmedi.

## iPhone sırası

Android çalışmadan ikinci cihazın ayarları başlatılmaz. Android kabulü sonrası iPhone modeli/iOS/Expo Go sürümü ve Mac ile bağlantı şekli alınır. iPhone’da Android’in `adb reverse` yöntemi yoktur; telefondaki localhost Mac değildir. Gerekirse mevcut localhost API’sini koruyan, yalnız seçili özel arayüzde dinleyen geliştirme geçidi ve token/parola için HTTPS değerlendirilir; sertifika/yerel ağ izni adımları cihaz bilgisiyle açıkça verilir. Şu anda LAN dinleyicisi, sertifika güveni, public tunnel veya PostgreSQL ağ erişimi açılmadı.
