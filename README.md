# Bite Routine

Bite Routine, **bir beslenme ve yemek günlüğü uygulamasıdır**. Türkçe gıda araması, gram/kcal birimleri ve `Europe/Istanbul` takvim günleri temel alınır.

[English](#english)

## Güncel main'de çalışanlar

- **Gıda kataloğu:** Türkçe arama, kaynak bağlantıları ve 100 g değerlerinden gramaja göre besin önizlemesi. Önizleme kendi başına kayıt oluşturmaz; eksik besin değerleri sıfır gösterilmez.
- **Kayıt ve oturum:** Web kayıt/giriş ekranları ASP.NET Core Identity API'sine bağlıdır. Aynı kökenli Next.js geçidi, HttpOnly oturum çerezi ve CSRF koruması kullanılır. `/account` oturumu `/me` ile doğrular; çıkış akışı vardır. Tarayıcıda token veya e-posta `localStorage`'a yazılmaz. [Oturum kararı](backend-dotnet/docs/auth-session.md).
- **Günlük API'si:** Oturum kullanıcısı katalogdan bir gıdayı gramajı ve İstanbul takvim günüyle ekleyebilir, seçilen günün yalnız kendi kayıtlarını listeleyebilir. Besin ve kaynak bilgileri kayıt anında kopyalanır. [Veri modeli ve HTTP sözleşmesi](backend-dotnet/docs/diary-contract.md).

### Açık geliştirme: PR #8

[Web günlüğü PR #8](https://github.com/caferkarabulut/healthy-eating-miner/pull/8), katalogdaki “Günlüğe ekle” akışını, tarih seçimini ve `/diary` ekranını içerir. **Bu web özellikleri henüz main'e birleşmedi.** Yukarıdaki günlük özelliği main'de API üzerinden kullanılabilir.

### Teknoloji ve kapsam

- `backend-dotnet/`: .NET 10, ASP.NET Core, EF Core, Npgsql ve PostgreSQL 17.
- `web/`: Next.js 16 ve TypeScript.
- `backend/`: önceki Python/Azure SQL prototipi. Eski dashboard, profil ve koçluk ekranları bu prototipe bağlı kalır; yeni geliştirme .NET üzerinde sürer.
- Mobil istemci ve deployment bu aşamada yoktur.

Yeni veritabanında migration'lar katalog verisi eklemez. Ayrı ve tekrar çalıştırılabilir seed komutu, [USDA FoodData Central](https://fdc.nal.usda.gov/api-guide/) kaynaklı sekiz temel gıda ekler. Yaklaşık değerler **100 g yenilebilir gıda** içindir; porsiyon değeri değildir. Birimi ve kullanım hakkı doğrulanmamış eski CSV içe aktarılmaz.

## Yerel kurulum

.NET SDK 10 (sürüm seçimi: `backend-dotnet/global.json`), PostgreSQL 17 ve Node.js 24 kullanın. [Backend kurulumundaki](backend-dotnet/README.md) yerel rol ile PostgreSQL'i `127.0.0.1:5433` üzerinde hazırlayın. `bite_routine` geliştirme, `bite_routine_test` yalnız test veritabanıdır. Ardından:

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

[Yerel kataloğu](http://127.0.0.1:3000) açın. API adresi `http://127.0.0.1:5080` olur. Farklı adres için Next.js sunucusunda `BITE_ROUTINE_API_URL` ayarlayın. Ayrıntılar: [backend kurulumu](backend-dotnet/README.md), [web kurulumu](web/README.md), [proje durumu](docs/PROJECT_STATUS.md).

### Doğrulama

`backend-dotnet/` içinde `dotnet test BiteRoutine.slnx --no-build --configuration Release` çalıştırın; `BITE_ROUTINE_TEST_CONNECTION` **yalnız** `bite_routine_test` veritabanını hedeflemelidir. Örnek bağlantı ve migration kontrolleri [backend belgesindedir](backend-dotnet/README.md). `web/` içinde `npm test`, `npm run build` ve `npm run lint` kullanılır.

## English

Bite Routine is a **nutrition and food diary app being developed for Türkiye**. It uses Turkish food search, grams/kcal and `Europe/Istanbul` calendar days.

### Available on main

- **Food catalog:** Turkish search, source links and a gram-based preview calculated from 100 g nutrition values. The preview alone does not save entries; missing nutrients remain unavailable.
- **Registration and sessions:** Web registration/login use ASP.NET Core Identity through a same-origin Next.js gateway, with an HttpOnly cookie and CSRF protection. `/account` verifies the session via `/me`; logout is supported. Tokens and email are not written to browser `localStorage`. See [session design](backend-dotnet/docs/auth-session.md).
- **Diary API:** Authenticated users add a catalog food with grams and an Istanbul calendar date, and list only their own entries for a selected day. Nutrition and source information are captured when the entry is created. See the [model and HTTP contract](backend-dotnet/docs/diary-contract.md).

### Open development: PR #8

[Web diary PR #8](https://github.com/caferkarabulut/healthy-eating-miner/pull/8) adds the catalog save action, date selection and `/diary` page. **These web features have not been merged into main.** The diary functionality on main is currently available through the API.

### Stack and scope

The active stack is .NET 10 / ASP.NET Core, EF Core, Npgsql, PostgreSQL 17 and Next.js 16 / TypeScript. `backend/` contains the earlier Python/Azure SQL prototype; its old dashboard, profile and coaching screens remain separate. There is no mobile client or deployment yet.

Migrations do not populate a new catalog. An explicit, repeatable seed adds eight basic foods from USDA FoodData Central, with approximate values per **100 g of edible food**, rather than per serving. The old CSV is not imported because its units and usage rights have not been verified.

### Local setup and validation

Use .NET SDK 10 (pinned by `backend-dotnet/global.json`), PostgreSQL 17 and Node.js 24. Follow the shared command blocks under [Yerel kurulum](#yerel-kurulum) above, starting from the repository root. The development database is `bite_routine`; `bite_routine_test` is reserved for tests. Open [the local catalog](http://127.0.0.1:3000); the API runs at `http://127.0.0.1:5080`. Set the server-side `BITE_ROUTINE_API_URL` if the API address differs.

Run `dotnet test BiteRoutine.slnx --no-build --configuration Release` from `backend-dotnet/` with `BITE_ROUTINE_TEST_CONNECTION` pointing **only** to `bite_routine_test`. From `web/`, run `npm test`, `npm run build` and `npm run lint`. See [backend setup](backend-dotnet/README.md), [web setup](web/README.md) and [project status](docs/PROJECT_STATUS.md) for detailed commands and limitations.

Lisans / License: MIT.
