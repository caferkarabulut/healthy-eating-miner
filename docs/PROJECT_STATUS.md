# Bite Routine durum — 15 Ekim 2026

## Karar

Aktif backend .NET 10 + EF Core + Npgsql + PostgreSQL 17. Ürün Türkiye pazarına yöneliktir: Türkçe katalog/arama, gram/kcal ve kullanıcıya gösterilen öğün günlerinde Europe/Istanbul. Azure SQL planı bırakıldı.

## Tamamlanan temel

- PR #3 (`feat/postgresql-meal-catalog`): PostgreSQL yemek kataloğu, ilk migration, Türkçe ICU collation, gerçek DB testleri ve CI.
- Geliştirme DB'si migration sonrası boş başlar; 25 demo yemek yalnız test fixture'ındadır.
- İlk migration hedef metadatası snapshot'tan bağımsızdır. Testler yalnız `bite_routine_test` içinde koşu başına ayrı şema kullanır.
- İkinci migration kaynaklı, yaklaşık 100 g besin alanlarını ekler. Sekiz temel gıdalık USDA FoodData Central başlangıç verisi açık ve tekrar çalıştırılabilir seed komutuyla geliştirme veritabanına eklenir; eski CSV kullanılmaz. Kaynak bağlantıları, FDC kimliğiyle doğru kaydı gösteren resmî arama sayfasına gider.
- Next.js ana sayfası .NET API'sinden Türkçe aranabilen, kaynak bağlantılı kataloğu gösterir. Yerel HTTP kontrolü yapıldı. Eski oturum, takip ve koçluk ekranları hâlâ Python API'sini bekler; mobil istemci yoktur.
- Katalogda seçilen gıda için gramaj bazlı besin önizlemesi istemcide hesaplanır. Eksik değerler sayı olarak gösterilmez; bu işlem öğün kaydı oluşturmaz.
- .NET API'de PostgreSQL üzerinde ASP.NET Core Identity kayıt/giriş, çerezli çıkış ve korumalı `/me` vardır. Web kayıt/giriş aynı kökenli geçitle HttpOnly çereze bağlandı; `/account` oturumu `/me` ile doğrular. Hem Next geçidi hem doğrudan API, çerezli durum değiştiren isteklerde CSRF koruması uygular. Mobil için Identity bearer tokenı kararı geçerlidir. Ağ sınırı ve oturum kararı: [`backend-dotnet/docs/auth-session.md`](../backend-dotnet/docs/auth-session.md).
- Kurulum ve komutlar: [`backend-dotnet/README.md`](../backend-dotnet/README.md). SQL kararları: [`backend-dotnet/docs/sql-development-plan.md`](../backend-dotnet/docs/sql-development-plan.md).

- Kullanıcıya özel günlük ekleme ve seçilen İstanbul gününü listeleme API'si eklendi. Gramaj ve tarih doğrulanır; besin/kaynak bilgisi kayıt anında kopyalanır, eksik besinler `null` kalır. [HTTP sözleşmesi](../backend-dotnet/docs/diary-contract.md). Migration henüz geliştirme DB'sine uygulanmadı; gerçek PostgreSQL testleri ayrı test şemalarında çalışır.

## Sıradaki iş

Sıradaki küçük adım, bu günlük API'sine aynı kökenli web geçidini ve katalogdan ekleme arayüzünü bağlamak. Eski Python takip ekranları taşınmadı. Sonrasında koçluk ve mobil istemci geliştirilebilir. Geleneksel Türk yemekleri için tarif, kaynak ve porsiyon tanımını ayrıca oluşturmak. Deployment yapılmadı.
