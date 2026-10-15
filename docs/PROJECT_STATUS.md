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

## Günlük düzenleme/silme (main)

- Kendi kaydına PATCH ile gramaj/tarih düzenleme ve DELETE ile silme; başkasının/olmayan kaydın yanıtı 404. Kayıt anındaki gıda, besin ve kaynak kopyaları korunur; model/migration değişmez.
- Web kartlarında düzenleme, silme onayı ve aynı kökenli PATCH/DELETE geçidi. İki CSRF katmanı ve önbelleksiz kişisel yanıtlar korunur. Başarı listeyi yeniler; belirsiz istekler otomatik tekrarlanmaz.
- PR #11 doğrulanan HEAD ve başarılı CI ile main'e birleşti. Gerçek PostgreSQL ve HTTP/tarayıcı kontrolleri sahiplik, snapshot, doğrulama, silme ve kalıcılığı doğrular.

## Günlük özeti (main)

- Günlük liste yanıtında `summary`: kayıt sayısı ve dört besin toplamı. Yalnız kullanıcı/gün kayıtlarının gramaj uygulanmış besin kopyaları decimal aritmetiğiyle, yuvarlanmadan toplanır. Eksik alan kendi toplamını null yapar; boş gün sıfırdır. Model/migration değişmez.
- Web liste üzerinde sade özet gösterir; null alanlar “Eksik veri” ve nedenini taşır. Aynı önbelleksiz liste yenilemesi ekleme/düzenleme/tarih taşıma/silme sonrası özeti de günceller.
- Doğrulama: gerçek PostgreSQL kullanıcı/gün ayrımı, gramaj, snapshot, boş gün, null/sıfır ve mutasyon testleri; web test/build/lint, HTTP ve tarayıcı akışı.

## Bu dal: web temizliği

- 12 lint uyarısının nedenleri giderildi: kullanılmayan import/değişkenler kaldırıldı; eski API yardımcısında oturum bitişi ilgili sayfanın Next.js router'ına bırakıldı. Kurallar kapatılmadı; eski ekran dosyaları korundu.
- Giriş/kayıt ekranlarına katalog dönüşü ve form etiketlerine alan bağlantıları eklendi. Kullanıcı metinleri sadeleşti; Europe/Istanbul tarih davranışı değişmedi. Yeni akış eski Python ekranlarına bağlantı vermiyor.
- Doğrulama: 31 web testi, build ve sıfır uyarılı lint. 320 px tarayıcıda katalog, kayıt/giriş, uzun e-postalı hesap, günlük ekleme/düzenleme/silme/çıkış denendi; taşma veya kullanılamayan form bulunmadı. Backend/model değişmediği için yerel backend testleri tekrarlanmadı; PR #12'nin başarılı CI doğrulaması esas alındı.

## Sıradaki iş

Web temizliği PR'ını incelemek. Yeni özellik veya deployment yapılmadı.
