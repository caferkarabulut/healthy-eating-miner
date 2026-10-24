# Tek komutla ücretsiz telefon testi

Bulut staging/EAS Update **ertelendi**; ücretli kaynak/deployment kurulmaz. Bu yöntem Mac açıkken çalışır.
PR #27 ve araç PR #28 sırasıyla main'e birleşti. Ücretli staging hazırlığı ayrı
`mobile-staging` çalışma alanında korunur; bu araç ücretli deployment dosyaları içermez.

## Kullanım

Depo kökünden:

```sh
node scripts/mobile-test.mjs
```

Komut hazır olmayı bekler; terminalde açma bağlantılarını ve yerel QR sayfasını gösterir.
QR terminalin içine çizilmez; yazdırılan yerel QR sayfasını tarayıcıda açın.
Mac Terminal'den çalıştırıldığında QR sayfası otomatik açılır. iPhone kamerasıyla **iPhone** QR'ını okutun;
kurulu **Bite Routine development build** açılır. Expo Go gerekmez. Android için mevcut Expo Go veya
development build bağlantısı ayrı gösterilir. Samsung fiziksel kabulü **cihaz mevcut değil — bekliyor**.
Mac/telefon farklı internette olabilir; ikisinde de internet gerekir. Mac kapalı/uykudaysa bağlantı çalışmaz.

Yalnız `mobile-tunnel-test-iphone@example.test` gibi `mobile-tunnel-test-…@example.test` hesaplarıyla test edin.
İlk kez kullanıyorsanız uygulamadaki kayıt ekranıyla benzersiz bir **test parolası** belirleyin; gerçek e-posta/
parola kullanmayın. Adres her başlangıçta değişebilir; mevcut token-origin kontrolü eski oturumu yeni adrese
göndermez. Bu durumda yeniden giriş gerekir. Kalıcı token origin'i veya TLS doğrulaması gevşetilmedi.

JS değişiklikleri çalışan Expo üzerinden Fast Refresh/yenilemeyle gelir; tüneli her kod değişikliğinde
kapatmak gerekmez. Native modül/SDK/izin değişirse yeni yerel development build gerekir; bu dilimde native
paket/sürüm veya uygulama özelliği değiştirilmedi. Paket kurulumu/build/testler her başlatmada tekrarlanmaz.
API kaynakları derlenmiş DLL'den yeniyse yalnız gerekli API Release derlemesi otomatik yapılır; migration/seed yine uygulanmaz.
Yeni tünel origin'i eski JS cache'inden gelmesin diye başlangıçta yalnız Metro transform cache'i temizlenir.

**Durdurma:** çalıştırdığınız terminalde Ctrl+C. Yalnız bu komutun API, Expo, tünel ve geçit süreçleri kapanır;
PostgreSQL ve önceden açık servisler kapanmaz. Profil/sertifika yükleme veya temizleme adımı yoktur.

## Düzen ve sınırlar

- API `127.0.0.1:5086`, Expo `127.0.0.1:8087`, geliştirme geçidi `127.0.0.1:8097`.
  Port doluysa hata verir; başka süreç öldürmez veya sessizce başka porta geçmez.
- Tek **Cloudflare Quick Tunnel**, geçide geçerli genel HTTPS sağlar. Geçit izinli API yollarını API'ye,
  manifest/bundle/assets ve HMR websocket'lerini Expo'ya yönlendirir. Expo'nun API'yi kendiliğinden
  yayınladığı varsayılmaz; iki servis için yönlendirme açıkça yapılır.
- Üretilen HTTPS origin'i yalnız Expo sürecinde `EXPO_PUBLIC_API_URL` ve `EXPO_PACKAGER_PROXY_URL` olur.
  `.env`, kaynak kod, kalıcı IP veya native yapılandırma değişmez. Ağ yakalayıcı kapalıdır.
- PostgreSQL tünellenmez. Başlangıç kontrolü yalnız localhost PostgreSQL 17 `bite_routine` geliştirme
  DB'si/public şemayı kabul eder; migration/seed eksikse yönlendirme verir, veri değiştirmez.
- Yerel ayar bulunmazsa managed worktree'nin ana checkout'undaki geliştirme bağlantısı bellekte okunur;
  bağlantı/parola çıktıya, mobil ortama veya dosyaya kopyalanmaz.
- Tünel adresi **erişim kontrolü değildir**. Katalog ve geliştirme JS'i genel erişimlidir. Yalnız test
  süresince açık tutulur; uygulama koduna secret konmaz. Cloudflare HTTPS'i sonlandırıp trafiği Mac'e
  şifreli tünelden taşır; sentetik istek/yanıtlar bu sağlayıcıdan geçer. DB veya gerçek hesap verisi buluta
  kopyalanmaz. Ürün/production ortamı değildir.
- Gerçek yerel hesapların girişleri geçitte reddedilir. Bearer, yerel API `/me` ile doğrulanıp yalnız
  belirtilen sentetik e-posta aralığına aitse özel istek iletilir. Refresh yanıtı da aynı kontrolden geçmeden
  dışarı verilmez. Çerezli auth kullanılmaz; login bearer'a zorlanır. Backend Identity/sahiplik/CSRF kodu değişmez.
  Bu aralık **yalnız geliştirme geçidi kısıtıdır**, ürünün e-posta politikası değildir.
- Favoriler için yalnız `GET /me/favorite-meals` ve pozitif Int32 gıda kimliğiyle
  `PUT`/`DELETE /me/favorite-meals/{mealId}` açıktır; diğer yöntem/yollar kapalıdır.
  Bu yollar da aynı sentetik bearer denetiminden geçer; çerezler taşınmaz.
- Kullanılmayan API uçları, uzaktan Expo açma POST'u ve debugger websocket'i kapalıdır. HMR `/hot` ve
  `/message` websocket'leri açıktır. İstek/yanıt gövdeleri, tokenlar, parolalar ve cihaz logları yazdırılmaz.

## Bir defalık önkoşullar

Bu Mac'te gerekli kurulum hazırlanır: Node 24, .NET 10, mevcut yerel PostgreSQL/ayarlar,
`brew install cloudflared`, `mobile/` içinde `npm ci`, `backend-dotnet/` içinde Release build.
Günlük kullanımda bu adımlar tekrar gerekmez. İlk iPhone development build zaten kurulu olmalıdır.
Telefon için geçici CA, sabit yerel IP, router/DB port açma, Cloudflare/Expo hesabı veya ücretli plan gerekmez.

[Cloudflare resmî Quick Tunnel belgesi](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/):
hesap/domain gerekmez, uptime garantisi yoktur; 200 eşzamanlı istek sınırı, 429 ve SSE desteği olmaması
bu yöntemin sınırlarıdır. Ücretsiz bağlantı kesilirse ücretliye geçilmez. E-posta PIN koruması non-interactive
mobil API istemcileriyle uyumlu olmadığından kullanılmaz; sentetik hesap geçidi bu yüzden ayrıca daraltılmıştır.
[Expo resmî proxy ve deep-link düzeni](https://docs.expo.dev/more/expo-cli/#server-url).

## Kanıt ve kabul

- 5 yerel geçit/süreç testi: gerçek hesap/login/refresh/çerez reddi, sentetik oturum, route sınırları,
  websocket, port çakışması ve ilgisiz sürecin korunması geçti.
- Mevcut 4 demo testiyle toplam 9 araç testi geçti. Son başlatıcı sürümünün yeniden açılması, genel HTTPS
  hazır olması, güvenli iPhone/Android QR bağlantıları ve SIGINT ile kapanması doğrulandı. 5086/8087/8097
  portları Node başlatıcı kontrolüyle tekrar kullanılabilir; cloudflared süreci kalmadı. Önceden açık API
  ve yalnız localhost'taki PostgreSQL korundu; geçici QR sekmesi kapatıldı.
- Mevcut mobil 61 test, TypeScript/lint ve değişmemiş API Release build geçti. Backend/model değişmedi;
  tüm PostgreSQL testleri yeniden çalıştırılmadı.
- PR #27 iPhone düzenleme/silme kabulü önceki **kullanıcı doğrulaması**dır; CA profilini kullanıcı sildi.
  Yeni tünel üzerinden kabul ayrıca tamamlandı; önceki kabul bunun yerine sayılmadı. Samsung bekliyor.

**24 Ekim iPhone kabulü — kullanıcı doğrulaması:** Wi-Fi kapalı/mobil internette QR ile mevcut development
build ve katalog açıldı. Kullanıcı sentetik kayıt/giriş, 100 g ve 1,5 adet ekleme, düzenleme/gün-öğün taşıma,
toplamlar, tam kapat/aç sonrası oturum-kayıt kalıcılığı, silme iptal/onay ve çıkış listesinin tamamının
çalıştığını bildirdi. Yeni CA/USB/aynı Wi-Fi kullanılmadı. Son bilinen cihaz iPhone 13/iOS 26.6.1;
bu turda işletim sistemi sürümü yeniden teyit edilmedi. Samsung fiziksel kabulü **cihaz mevcut değil — bekliyor**.

Otomatik kontrollerin iki rastgele smoke hesabı ve kayıtları temizlendi. Kullanıcının manuel sentetik test
hesabı sonraki denemelerde yeniden kayıt gerekmemesi için yerelde korunur; parolası okunmaz/kaydedilmez.
