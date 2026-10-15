# Bite Routine durum — 15 Ekim 2026

## Karar

Aktif backend .NET 10 + EF Core + Npgsql + PostgreSQL 17. Ürün Türkiye pazarına yöneliktir: Türkçe katalog/arama, gram/kcal ve kullanıcıya gösterilen öğün günlerinde Europe/Istanbul. Azure SQL planı bırakıldı.

## Tamamlanan temel

- PR #3 (`feat/postgresql-meal-catalog`): PostgreSQL yemek kataloğu, ilk migration, Türkçe ICU collation, gerçek DB testleri ve CI.
- Geliştirme DB'si migration sonrası boş başlar; 25 demo yemek yalnız test fixture'ındadır.
- İlk migration hedef metadatası snapshot'tan bağımsızdır. Testler yalnız `bite_routine_test` içinde koşu başına ayrı şema kullanır.
- İkinci migration kaynaklı, yaklaşık 100 g besin alanlarını ekler. Sekiz temel gıdalık USDA FoodData Central başlangıç verisi açık ve tekrar çalıştırılabilir seed komutuyla geliştirme veritabanına eklenir; eski CSV kullanılmaz. Kaynak bağlantıları, FDC kimliğiyle doğru kaydı gösteren resmî arama sayfasına gider.
- Next.js ana sayfası .NET API'sinden Türkçe aranabilen, kaynak bağlantılı kataloğu gösterir. Yerel HTTP kontrolü yapıldı. Eski takip ve koçluk ekranları hâlâ Python API'sini bekler; mobil istemci yoktur.
- Katalogdaki gramaj önizlemesinden açık “Günlüğe ekle” işlemiyle kayıt oluşturulur. Türkçe virgüllü gramaj desteklenir; eksik besinler “Veri yok” kalır.
- .NET API'de PostgreSQL üzerinde ASP.NET Core Identity kayıt/giriş, çerezli çıkış ve korumalı `/me` vardır. Web kayıt/giriş aynı kökenli geçitle HttpOnly çereze bağlandı; `/account` oturumu `/me` ile doğrular. Hem Next geçidi hem doğrudan API, çerezli durum değiştiren isteklerde CSRF koruması uygular. Mobil için Identity bearer tokenı kararı geçerlidir. Ağ sınırı ve oturum kararı: [`backend-dotnet/docs/auth-session.md`](../backend-dotnet/docs/auth-session.md).
- Kurulum ve komutlar: [`backend-dotnet/README.md`](../backend-dotnet/README.md). SQL kararları: [`backend-dotnet/docs/sql-development-plan.md`](../backend-dotnet/docs/sql-development-plan.md).

- PR #7 ile günlük API'si main'e birleşti. Gramaj ve tarih doğrulanır; besin/kaynak bilgisi kayıt anında kopyalanır, eksikler `null` kalır. [HTTP sözleşmesi](../backend-dotnet/docs/diary-contract.md). Günlük migration'ı yalnız doğrulanmış `bite_routine` geliştirme DB'sine uygulandı; kullanıcı/katalog verisi korundu. Backend testleri ayrı `bite_routine_test` şemalarında çalışır.
- Web'de aynı kökenli, iki katmanlı CSRF korumalı günlük GET/POST geçidi ve `/diary` sayfası eklendi. Varsayılan gün Europe/Istanbul'dur; yanıtlar önbelleğe alınmaz. Belirsiz POST otomatik tekrarlanmaz. [Web çalıştırma/test notları](../web/README.md).

## Bu dal: günlük düzenleme/silme

- Kendi kaydına PATCH ile gramaj/tarih düzenleme ve DELETE ile silme; başkasının/olmayan kaydın yanıtı 404. Kayıt anındaki gıda, besin ve kaynak kopyaları korunur; model/migration değişmez.
- Web kartlarında düzenleme, silme onayı ve aynı kökenli PATCH/DELETE geçidi. İki CSRF katmanı ve önbelleksiz kişisel yanıtlar korunur. Başarı listeyi yeniler; belirsiz istekler otomatik tekrarlanmaz.
- Doğrulama: gerçek PostgreSQL sahiplik, snapshot, doğrulama ve silme testleri; web test/build/lint; HTTP CSRF/kullanıcı ayrımı ve tarayıcı düzenleme/tarih taşıma/silme/yenileme kontrolleri. Özellik PR'ı inceleme için açılır; merge/deployment bu adımda yapılmaz.

## Sıradaki iş

Özellik PR'ını incelemek. Toplamlar, koçluk, eski Python ekranlarının taşınması ve mobil istemci bu değişikliğin kapsamı dışındadır. Geleneksel Türk yemekleri için tarif, kaynak ve porsiyon tanımı ayrıca hazırlanmalıdır. Deployment yapılmadı.
