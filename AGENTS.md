# Bite Routine çalışma notları

- Güncel backend: `backend-dotnet/` altında .NET 10, EF Core, Npgsql ve PostgreSQL 17. Azure SQL ve eski Python backend yeni geliştirme için temel değildir.
- Hedef pazar Türkiye: Türkçe arama ve içerik, gram/kcal birimleri, kullanıcıya gösterilen öğün günleri için Europe/Istanbul. Kaynağı ve birimi doğrulanmamış besin verisini yayımlama.
- Başlamadan önce Git durumunu ve `docs/PROJECT_STATUS.md` dosyasını oku; yerel değişiklikleri koru. Gizli bağlantı bilgilerini commit etme veya çıktıda gösterme.
- `backend-dotnet/` içinde: `dotnet restore BiteRoutine.slnx`, `dotnet build BiteRoutine.slnx --no-restore --configuration Release`, gerçek PostgreSQL 17 ile `dotnet test BiteRoutine.slnx --no-build --configuration Release`. Test bağlantısı yalnız `bite_routine_test` veritabanına yönelmeli.
- Migration değişirse `dotnet tool restore` ve `dotnet ef migrations has-pending-model-changes --project src/BiteRoutine.Api --no-build --configuration Release` çalıştır. Yeni migration için geçici kopyada scaffold ve derleme de doğrula. API uç noktası değişirse yerel HTTP kontrolü yap.
- Sonuçta çalışan kontrolleri, kalan engeli ve gerçekten gereken manuel işlemi kısa raporla. Merge, deployment ve dal silme yalnız açık görev kapsamında yapılır.
- Commit mesajlarını kısa tut; PR açıklamasını yapılan değişikliği ve gerekli doğrulamayı anlatan birkaç cümleyle yaz.
- Kök README ürün tanıtımıdır; her görevde güncellenmez. Teknik ayrıntılar ilgili belgelerde tutulur.
