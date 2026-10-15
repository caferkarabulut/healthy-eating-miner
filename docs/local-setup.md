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

### Doğrulama

`backend-dotnet/` içinde `dotnet test BiteRoutine.slnx --no-build --configuration Release` çalıştırın; `BITE_ROUTINE_TEST_CONNECTION` **yalnız** `bite_routine_test` veritabanını hedeflemelidir. Örnek bağlantı ve migration kontrolleri [backend belgesindedir](../backend-dotnet/README.md). `web/` içinde `npm test`, `npm run build` ve `npm run lint` kullanılır.

