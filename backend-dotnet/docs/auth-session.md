# Kimlik ve oturum kararı

Kullanıcılar PostgreSQL'de ASP.NET Core Identity'nin EF Core tablolarında tutulur. Parola doğrulaması ve hashleme `UserManager`/Identity tarafından yapılır. Uygulama parola hashleme veya token üretme kodu içermez. Kayıtta benzersiz e-posta ve en az sekiz karakterli, Identity'nin varsayılan karmaşıklık kurallarına uyan parola istenir. Kayıt otomatik giriş yapmaz.

`POST /auth/register` gövdesi `{ "email": "...", "password": "..." }` alır. `POST /auth/login` aynı gövdeyle varsayılan olarak Identity'nin **opaque bearer** erişim ve yenileme tokenlarını döndürür; bunlar JWT değildir. `POST /auth/refresh` yenileme tokenını kabul eder. `GET /me` geçerli oturum gerektirir ve yalnız kullanıcı kimliği ile e-postasını döndürür. `GET /meals`, `GET /meals/{mealId}` ve sağlık uç noktaları anonim erişime açık kalır. Identity'nin hazır API haritası altında diğer `/auth` yönetim uç noktaları da bulunur.

## İstemci seçimi

- **Web:** `POST /auth/login?useCookies=true` ile Identity'nin HttpOnly oturum çerezini kullan. Next.js sunucu geçidi `/api/auth/*` isteklerini aynı kökende karşılar; tarayıcıya bearer/yenileme tokenı verilmez. Giriş, kayıt ve çıkış POST'ları için hem aynı köken Origin/Fetch Metadata kontrolü hem HttpOnly çerez ve istek başlığında eşleşen rastgele CSRF belirteci gerekir. API ayrıca kendi antiforgery belirtecini çerezli durum değiştiren isteklerde doğrular. HTTPS üzerinde web çerezi `Secure` olur. Hesap sayfası sunucuda `/me` ile oturumu doğrular. Eski Python takip ekranları bu akışa taşınmadı.
- **Gelecekteki mobil istemci:** çerez yerine varsayılan Identity bearer tokenı kullan; erişim tokenını `Authorization: Bearer` başlığında gönder, `/auth/refresh` ile yenile, cihazın güvenli saklama alanını kullan. Identity tokenları yalnız bu API içindir; üçüncü taraf OAuth/OIDC kimliği veya JWT gerekecekse ayrı bir sağlayıcı kararı gerekir.

## Ağ düzeni ve CSRF sınırı

Yerelde web `127.0.0.1:3000`, API `127.0.0.1:5080` üzerinde çalışır. Bunlar ayrı **origin** olsa da aynı **host** üzerindeki çerezler portlara göre ayrılmaz ([RFC 6265, bölüm 8.5](https://www.rfc-editor.org/rfc/rfc6265.html#section-8.5)). Bu nedenle tarayıcı API portuna doğrudan erişebildiğinde yalnız Next.js geçidindeki CSRF kontrolü yeterli değildir. Aynı risk web ile API tek origin altında farklı yollardan yayımlanırsa da geçerlidir.

API, Identity uygulama çerezi taşıyan tüm `POST`/`PUT`/`PATCH`/`DELETE` isteklerinde ve `POST /auth/login?useCookies=true` çağrısında ASP.NET Core `IAntiforgery` doğrulaması yapar. Belirteç yoksa veya geçersizse `403` döner. Next.js geçidi `GET /auth/antiforgery` ile API çerezini ve istek belirtecini **sunucudan sunucuya** alır; çerezli giriş ve çıkış çağrısına ikisini ekler. Bu API belirteci tarayıcıya aktarılmaz. Tarayıcı yalnız Next geçidinin ayrı CSRF belirtecini alır. Böylece geçidi atlayan doğrudan çerezli `POST /auth/logout` oturumu kapatamaz. API token uç noktasının yanıtı `no-store`'dur; API, bilinmeyen origin'lere kimlik bilgili CORS erişimi vermemelidir. Bu katman [ASP.NET Core antiforgery](https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery?view=aspnetcore-10.0) hizmetini kullanır.

Dağıtımda web çerezi web hostuna ait kalmalı; Next.js API'ye sunucu tarafında erişmelidir. API özel ağda veya ayrı hostta olabilir. Aynı host/port paylaşımı ya da doğrudan API erişimi varsa API antiforgery kontrolü korunmalıdır. Mobil istemci Identity bearer tokenını `Authorization` başlığında gönderir ve çerez göndermez; bearer giriş, yenileme ve `/me` için CSRF belirteci gerekmez. Çerez ve bearer birlikte gönderilirse güvenli tarafta kalmak için API çerezli istek kuralını uygular.

E-posta gönderimi bu adımda kurulmadı; e-posta doğrulama ve parola kurtarma akışları kullanıma hazır sayılmamalı. Herkese açık dağıtımdan önce e-posta teslimi, HTTPS sonlandırması, kimlik uç noktalarının hız sınırları ve Identity çerez/tokenlarının kullandığı Data Protection anahtarlarının kalıcı/paylaşımlı saklanması ayrıca tamamlanmalıdır. Seçilen yerleşik davranışlar için [Microsoft'un Identity API belgeleri](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/identity-api-authorization?view=aspnetcore-10.0) temel alınmıştır.

## Yerel doğrulama

Önce PostgreSQL 17'yi başlatıp migration'ı geliştirme veritabanına uygula (`README.md`). Yalnız test veritabanına yönelen aşağıdaki komut, ayrı şemalarda kayıt, giriş, hatalı giriş, API antiforgery, çerez/bearer oturumu ve yetkisiz erişimi doğrular:

```bash
BITE_ROUTINE_TEST_CONNECTION='Host=127.0.0.1;Port=5433;Database=bite_routine_test;Username=bite_routine;Password=local_dev_only' dotnet test BiteRoutine.slnx --no-build --configuration Release
```

Buradaki parola yalnız yerel örnek Compose kurulumu içindir; gerçek bağlantı bilgileri kaynak koduna eklenmemelidir.
