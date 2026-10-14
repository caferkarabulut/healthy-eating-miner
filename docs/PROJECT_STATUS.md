# Bite Routine durum — 14 Ekim 2026

## Karar

Aktif backend .NET 10 + EF Core + Npgsql + PostgreSQL 17. Ürün Türkiye pazarına yöneliktir: Türkçe katalog/arama, gram/kcal ve kullanıcıya gösterilen öğün günlerinde Europe/Istanbul. Azure SQL planı bırakıldı.

## Tamamlanan temel

- PR #3 (`feat/postgresql-meal-catalog`): PostgreSQL yemek kataloğu, ilk migration, Türkçe ICU collation, gerçek DB testleri ve CI.
- Geliştirme DB'si migration sonrası boş başlar; 25 demo yemek yalnız test fixture'ındadır.
- İlk migration hedef metadatası snapshot'tan bağımsızdır. Testler yalnız `bite_routine_test` içinde koşu başına ayrı şema kullanır.
- İkinci migration kaynaklı, yaklaşık 100 g besin alanlarını ekler. Sekiz temel gıdalık USDA FoodData Central başlangıç verisi açık ve tekrar çalıştırılabilir seed komutuyla geliştirme veritabanına eklenir; eski CSV kullanılmaz. Kaynak bağlantıları, FDC kimliğiyle doğru kaydı gösteren resmî arama sayfasına gider.
- Next.js ana sayfası .NET API'sinden Türkçe aranabilen, kaynak bağlantılı kataloğu gösterir. Yerel HTTP kontrolü yapıldı. Eski oturum, takip ve koçluk ekranları hâlâ Python API'sini bekler; mobil istemci yoktur.
- Kurulum ve komutlar: [`backend-dotnet/README.md`](../backend-dotnet/README.md). SQL kararları: [`backend-dotnet/docs/sql-development-plan.md`](../backend-dotnet/docs/sql-development-plan.md).

## Sıradaki iş

Oturum, günlük takip ve koçluk işlevlerini .NET'e geçirmek; ardından mobil istemciyi geliştirmek. Geleneksel Türk yemekleri için tarif, kaynak ve porsiyon tanımını ayrıca oluşturmak. Deployment yapılmadı.
