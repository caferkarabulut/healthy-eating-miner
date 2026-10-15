# Yerel geliştirme

Komutları depo kökünden başlayarak çalıştırın.

## Yerel kurulum

.NET SDK 10 (sürüm seçimi: `backend-dotnet/global.json`), PostgreSQL 17 ve Node.js 24 kullanın. [Backend kurulumundaki](../backend-dotnet/README.md) yerel rol ile PostgreSQL'i `127.0.0.1:5433` üzerinde hazırlayın. `bite_routine` geliştirme, `bite_routine_test` yalnız test veritabanıdır. Ardından:

```bash
cd backend-dotnet
dotnet tool restore
dotnet restore BiteRoutine.slnx
dotnet build BiteRoutine.slnx --no-restore --configuration Release
ASPNETCORE_ENVIRONMENT=Development dotnet ef database update --project src/BiteRoutine.Api --no-build --configuration Release
psql -h 127.0.0.1 -p 5433 -U bite_routine -d bite_routine -v ON_ERROR_STOP=1 -f db/seed-usda-starter.sql
ASPNETCORE_ENVIRONMENT=Development dotnet run --project src/BiteRoutine.Api --configuration Release --no-build --no-launch-profile --urls http://127.0.0.1:5080
```

İkinci terminalde, repo kökünden:

```bash
cd web
npm ci
npm run dev -- --hostname 127.0.0.1
```

[Yerel kataloğu](http://127.0.0.1:3000) açın. API adresi `http://127.0.0.1:5080` olur. Farklı adres için Next.js sunucusunda `BITE_ROUTINE_API_URL` ayarlayın. Ayrıntılar: [backend kurulumu](../backend-dotnet/README.md), [web kurulumu](../web/README.md), [proje durumu](PROJECT_STATUS.md).

## Tek komutla yerel demo

Yukarıdaki ilk kurulum tamamlandıktan sonra, depo kökünde:

```bash
node scripts/local-demo.mjs
```

macOS/Linux üzerinde Node.js 24 ve .NET SDK 10 kullanır. API'nin mevcut Release derlemesini ve kurulu web bağımlılıklarını kullanır; her açılışta restore, paket kurulumu, build veya test çalıştırmaz. API kaynak kodu değişmişse önce bir kez yukarıdaki Release build adımını çalıştırın. Next.js geliştirme sunucusu sayfaları gerektiğinde derler; bu normaldir.

Başlatıcı .NET'in mevcut `appsettings.json` → `appsettings.Development.json` → ortam değişkeni önceliğiyle okuduğu bağlantıyı kullanır. Gerekirse `ConnectionStrings__BiteRoutine` değerini yalnız kendi terminal ortamınızda ayarlayın; bağlantı dizesini/parolayı repoya veya paylaşılan çıktılara yazmayın. Yeni `.env`, hesap veya parola dosyası oluşturulmaz. Next.js geçidi bu çalıştırmada sabit yerel API'ye yönelir; eski `.env.local` API adresi bu ortam değişkenini geçersiz kılamaz.

Ön kontrol yalnız localhost/127.0.0.1/::1 üzerindeki **bite_routine** geliştirme DB'sini, varsayılan/public şemasını ve PostgreSQL 17'yi kabul eder. DB okumaları sunucu oturumunda salt okunurdur: bağlantı, bekleyen migration ve kaynak eşlemesindeki katalog kimlikleri/besin alanları doğrulanır. Test DB'si reddedilir. Migration veya seed eksikse komut durur ve bu belgedeki manuel kurulum adımına yönlendirir; otomatik migration/seed/veri değişikliği yapmaz.

5080 ve 3000 portları boşsa API `Development`, Next.js `development` ortamıyla yalnız `127.0.0.1` üzerinde başlar. API liveness ve web giriş/katalog sayfaları HTTP 200 verdiğinde (servis başına en fazla 90 saniye) **http://127.0.0.1:3000** adresi gösterilir. Tarayıcı kendiliğinden açılmaz. Kendi hesabınızla kayıt/giriş yapabilirsiniz; başlatıcı demo hesabı üretmez. Hesap ve günlük işlemleri normal uygulama davranışıyla geliştirme DB'sine kaydedilir.

**Durdurma:** terminalde Ctrl+C. SIGINT/SIGTERM veya servis hatasında yalnız bu çalıştırmanın API/web süreç grupları ve alt süreçleri kapatılır; PostgreSQL hizmeti ve diğer süreçler korunur. Port doluysa mevcut süreç öldürülmez ve başka porta sessiz geçiş yapılmaz.

**Sorun giderme:** Eksik bağımlılıkta bir kez `web/` içinde `npm ci`; eksik/eski API derlemesinde yukarıdaki restore/Release build komutları gerekir. DB hatasında PostgreSQL hizmetini ve yerel ayarı kontrol edin; migration/seed için hedefi doğrulayıp yalnız yukarıdaki açık adımları uygulayın. Servis erken kapanırsa/hazır olmazsa ayrıntı için bu belgedeki iki terminalli komutları çalıştırın. Başlatıcı, gizli değer sızdırmamak için alt servislerin ham loglarını veya istisnalarını yazdırmaz.

Başlatıcı kontrolleri: depo kökünde `node --test scripts/local-demo.test.mjs`. Gerçek port çakışması, HTTP hazır olma/zaman aşımı ve yalnız sahip olunan süreç grubunun kapanması test edilir; CI da bunları çalıştırır.

### Doğrulama

`backend-dotnet/` içinde `dotnet test BiteRoutine.slnx --no-build --configuration Release` çalıştırın; `BITE_ROUTINE_TEST_CONNECTION` **yalnız** `bite_routine_test` veritabanını hedeflemelidir. Örnek bağlantı ve migration kontrolleri [backend belgesindedir](../backend-dotnet/README.md). `web/` içinde `npm test`, `npm run build` ve `npm run lint` kullanılır.

