# Kimlik ve oturum kararı

Kullanıcılar PostgreSQL'de ASP.NET Core Identity'nin EF Core tablolarında tutulur. Parola doğrulaması ve hashleme `UserManager`/Identity tarafından yapılır. Uygulama parola hashleme veya token üretme kodu içermez. Kayıtta benzersiz e-posta ve en az sekiz karakterli, Identity'nin varsayılan karmaşıklık kurallarına uyan parola istenir. Kayıt otomatik giriş yapmaz.

`POST /auth/register` gövdesi `{ "email": "...", "password": "..." }` alır. `POST /auth/login` aynı gövdeyle varsayılan olarak Identity'nin **opaque bearer** erişim ve yenileme tokenlarını döndürür; bunlar JWT değildir. `POST /auth/refresh` yenileme tokenını kabul eder. `GET /me` geçerli oturum gerektirir ve yalnız kullanıcı kimliği ile e-postasını döndürür. `GET /meals`, `GET /meals/{mealId}` ve sağlık uç noktaları anonim erişime açık kalır. Identity'nin hazır API haritası altında diğer `/auth` yönetim uç noktaları da bulunur.

## İstemci seçimi

- **Web:** `POST /auth/login?useCookies=true` ile Identity'nin HttpOnly oturum çerezini kullan. Tarayıcı JavaScript'ine bearer/yenileme tokenı verme veya bunları `localStorage`'a koyma. Web arayüzü bağlanırken API'yi aynı kökenli bir sunucu geçidi üzerinden sun; çerezli durum değiştiren istekler için CSRF korumasını ve HTTPS ayarlarını o adımda tamamla. Bu PR web giriş ekranını değiştirmez.
- **Gelecekteki mobil istemci:** çerez yerine varsayılan Identity bearer tokenı kullan; erişim tokenını `Authorization: Bearer` başlığında gönder, `/auth/refresh` ile yenile, cihazın güvenli saklama alanını kullan. Identity tokenları yalnız bu API içindir; üçüncü taraf OAuth/OIDC kimliği veya JWT gerekecekse ayrı bir sağlayıcı kararı gerekir.

E-posta gönderimi bu adımda kurulmadı; e-posta doğrulama ve parola kurtarma akışları kullanıma hazır sayılmamalı. Herkese açık dağıtımdan önce e-posta teslimi, HTTPS, web CSRF akışı, kimlik uç noktalarının hız sınırları ve Identity çerez/tokenlarının kullandığı Data Protection anahtarlarının kalıcı/paylaşımlı saklanması ayrıca tamamlanmalıdır. Seçilen yerleşik davranışlar için [Microsoft'un Identity API belgeleri](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/identity-api-authorization?view=aspnetcore-10.0) temel alınmıştır.

## Yerel doğrulama

Önce PostgreSQL 17'yi başlatıp migration'ı geliştirme veritabanına uygula (`README.md`). Yalnız test veritabanına yönelen aşağıdaki komut, ayrı şemalarda kayıt, giriş, hatalı giriş, çerez/bearer oturumu ve yetkisiz erişimi doğrular:

```bash
BITE_ROUTINE_TEST_CONNECTION='Host=127.0.0.1;Port=5433;Database=bite_routine_test;Username=bite_routine;Password=local_dev_only' dotnet test BiteRoutine.slnx --no-build --configuration Release
```

Buradaki parola yalnız yerel örnek Compose kurulumu içindir; gerçek bağlantı bilgileri kaynak koduna eklenmemelidir.
