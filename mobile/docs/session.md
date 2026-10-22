# Mobil oturum

## Sözleşme ve saklama

Mevcut [backend oturum kararı](../../backend-dotnet/docs/auth-session.md) geçerlidir. `POST /auth/register` kayıt oluşturur; otomatik giriş yapmaz. `POST /auth/login?useCookies=false` ve `POST /auth/refresh` Identity’nin **opak Data Protection bearer** access/refresh tokenlarını verir. JWT çözümlemesi veya özel token üretimi yoktur. `GET /me` yanıtı `userId` ve nullable `email` taşır. Mobil istekler çerez göndermez; web’in aynı kökenli geçidi/CSRF düzeni değişmedi.

[SDK 58 SecureStore](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/) `expo install` ile eklendi. Tek SecureStore öğesinde API origin, access/refresh token ve `expiresIn` üzerinden hesaplanan yerel son geçerlilik zamanı saklanır. `WHEN_UNLOCKED_THIS_DEVICE_ONLY` kullanılır. Parola/e-posta kalıcı depoya yazılmaz; log, düz metin dosya veya başka depoya yedekleme yoktur. SecureStore okuma/yazma/silme hataları açıkça gösterilir; silme başarısızsa çıkış yeniden denenebilir. iOS Keychain verisi uygulama kaldırıldıktan sonra da kalabileceğinden kaldırma işlemi güvenilir çıkış değildir.

Başlangıçta SecureStore okunur ve `/me` ile doğrulanır. API origin değişmişse eski anahtar temizlenir, token başka sunucuya taşınmaz. Son geçerliliğe 30 saniye kalınca veya `/me` 401 dönünce refresh yapılır; eşzamanlı istekler tek yenilemeyi paylaşır. Yenilenen çift güvenli saklamaya yazılır. İkinci 401 döngüye girmez. Uygulama ön plana geldiğinde hesap yeniden doğrulanır; arka planda sürekli yenileme yoktur.

Refresh 400/401/403 ile reddedilirse oturum temizlenir. Ağ hatası, zaman aşımı, 5xx veya okunamayan yanıt oturumu silmez; kullanıcı yeniden deneyebilir. Eski hesap bilgisi varsa çevrimdışı uyarısıyla gösterilir, başarılı yeni doğrulama gibi sunulmaz. İstekler otomatik tekrarlanmaz; yalnız 401 sonrası tek yetkilendirme yenilemesi vardır. Katalog her durumda oturumsuz açıktır.

## Çıkışın sınırı

Mobil çıkış **yalnız bu cihazdaki tokenları siler**. Mevcut `/auth/logout` çerez şemasına aittir; bearer oturum iptal uç noktası değildir. Mobil onu çağırarak sunucuda iptal olmuş gibi davranmaz. Önceden alınmış bir bearer, süresi dolana veya sunucudaki Identity doğrulaması onu geçersiz kılana kadar geçerli olabilir; diğer cihazların oturumu kapanmaz. Bu davranış gerçek `/me` isteğiyle doğrulandı. Token başına sunucu iptali bu dilimde eklenmedi.

Her oturum işlemi nesil numarasıyla korunur; çıkış yeni nesle geçer. Geç dönen login/refresh/hesap yanıtı oturumu geri getiremez. SecureStore işlemleri sıralıdır; başlamış bir yazma çıkıştan sonra bitse bile arkasından silinir. Silme hatası başarılı kalıcı çıkış olarak gösterilmez.

## Doğrulama ve tekrar deneme

29 davranış testi: opak bearer ve SecureStore sınırı, geri yükleme, eşzamanlı/401 yenileme, geçersiz yenileme, ağ/5xx korunması, çıkıştan sonra geç gelen yanıt/yazma, depolama hatası, alan hata eşlemesi ve düzeltip tekrar kayıt. TypeScript, lint, Expo paket uyumu ve iOS Metro paketlemesi de çalışır. Mevcut mobil CI tüm bu testleri keşfeder; native Simulator testi değildir.

Gerçek yerel API kontrolü (yalnız localhost geliştirme ortamı):

```sh
EXPO_PUBLIC_API_URL=http://127.0.0.1:5080 npm run smoke:session
```

Komut tek geçici hesap oluşturur; çıktıdaki korumalı receipt dosyası yalnız sentetik e-posta/kullanıcı kimliği içerir. Token/parola yalnız bellektedir. **Bu komut hesabı otomatik silmez**; ardından yalnız bu hesaba ait veriyi doğrulanmış geliştirme DB’sinden güvenli biçimde temizlemek gerekir. Bu teslimde oluşturulan tüm geçici hesaplar temizlendi. Mevcut kullanıcılara/kataloğa dokunulmadı.

HTTP kontrolü zayıf parola → düzeltip kayıt, yanlış parola, giriş, `/me`, yeni istemcide geri yükleme, gerçek refresh çağrısı, tek yenileme, yerel çıkışın sınırı ve geçersiz refresh temizliğini doğruladı. Saat yalnız test istemcisinde ileri alınarak gerçek refresh çağrıldı; sunucu token süresi değiştirilmedi, doğal sürenin dolması beklenmedi.

iOS 27.1 Simulator / Expo Go’da gerçek API ile aynı form akışı, yazılım klavyesi, hesap, uygulamayı tamamen kapatıp açınca geri yükleme ve çıkıştan sonra kapalı kalma görüldü. Geçici hesabın silinmesiyle `/me` + refresh reddi ve “Oturumunuz sona erdi” ekranı doğrulandı. Bu, doğal süre dolmasını bekleme testi değildir. Ağ kesintisi/yarış durumları otomatik testlerde doğrulandı; fiziksel iPhone/Android kabulü daha sonra kullanıcı doğrulamasıyla tamamlandı; ayrı cihaz kaydına bakın.

## Kullanıcının kısa kontrolü

1. Katalog → Giriş yap → Kayıt ol: zayıf parolayı düzeltip yenilemeden tekrar gönderin; başarıdan açık Giriş yap bağlantısını kullanın.
2. Yanlış parolayı deneyin, düzeltince hatanın temizlendiğini ve hesabın açıldığını görün.
3. Uygulamayı tamamen kapatıp açın; Hesabım’da oturum gelmeli. Çıkış yapıp tekrar açınca giriş istenmeli; katalog açık kalmalı.

Gerçek cihaz kabulü önce Android USB, ardından iPhone olarak [ayrı kontrol kaydında](device-validation.md) yürütülür. İki cihazın oturum kabulü kullanıcı doğrulamasıyla tamamlandı; Simulator ve paketleme sonuçları ayrı tutulur.

Günlük istekleri de aynı bearer/tek refresh ve oturum nesli korumasını kullanır; [mobil günlük sözleşmesi](diary.md).
