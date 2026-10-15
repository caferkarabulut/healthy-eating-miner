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

## Web temizliği (main)

- 12 lint uyarısının nedenleri giderildi: kullanılmayan import/değişkenler kaldırıldı; eski API yardımcısında oturum bitişi ilgili sayfanın Next.js router'ına bırakıldı. Kurallar kapatılmadı; eski ekran dosyaları korundu.
- Giriş/kayıt ekranlarına katalog dönüşü ve form etiketlerine alan bağlantıları eklendi. Kullanıcı metinleri sadeleşti; Europe/Istanbul tarih davranışı değişmedi. Yeni akış eski Python ekranlarına bağlantı vermiyor.
- Doğrulama: 31 web testi, build ve sıfır uyarılı lint. 320 px tarayıcıda katalog, kayıt/giriş, uzun e-postalı hesap, günlük ekleme/düzenleme/silme/çıkış denendi; taşma veya kullanılamayan form bulunmadı. Backend/model değişmediği için yerel backend testleri tekrarlanmadı; PR #12'nin başarılı CI doğrulaması esas alındı.

## Günlük öğünleri (main)

- Günlük `mealSlot`: breakfast/lunch/dinner/snack/other; katalog mealType alanından bağımsız. POST'ta atlanırsa other, PATCH'te atlanırsa mevcut öğün korunur; geçersiz değerler 400. Yanıtlar öğünü taşır, sahiplik ve iki CSRF katmanı korunur.
- AddDiaryMealSlot yalnız yeni sütun/varsayılan/CHECK ekler; eski kayıtlar other olur. Migration hedefi localhost PostgreSQL 17 bite_routine olarak doğrulandı ve uygulandı; kullanıcı/katalog/günlük içerikleri önce/sonra karşılaştırıldı. Dolu eski şemadan geçiş ayrıca gerçek PostgreSQL testinde doğrulandı.
- Web ekleme/düzenlemede Türkçe öğün seçimi, listede sabit sırada gruplama. Günlük özeti tüm öğünleri kapsar; öğün değişimi besin toplamlarını değiştirmez.
- Doğrulama: 77 gerçek PostgreSQL testi, 33 web testi, Release build, web build/lint, pending-model kontrolü ve geçici kopyada boş sonraki migration scaffold/derleme. Tarayıcıda beş öğüne ekleme, öğün taşıma, sıralama ve sayfa yenileme sonrası kalıcılık/toplamlar doğrulandı.

## Katalog genişletme (main)

- Başlangıç kataloğu 30 kaynaklı temel gıdaya genişletildi. USDA Food Details yanıtındaki kimlik/açıklama/birim/100 g miktarlar doğrulandı; ham seçilmiş alanlar ve [kaynak eşlemesi](../backend-dotnet/docs/usda-catalog-sources.md) eklendi. Geleneksel yemek veya tahmini tarif yoktur.
- Eski sekiz kaynak kimliği/gıda kimliği korunur; katalogdaki kaba yuvarlamalar resmî ayrıntı değerleriyle düzeltilir. Seed yalnız katalog ad/besin/kaynak alanlarını günceller; geçmiş günlük kopyalarına dokunmaz. Model/migration değişmedi.
- Geliştirme hedefi localhost PostgreSQL 17 `bite_routine` olarak doğrulandı; seed iki kez uygulandı. Her iki çalıştırmada eski kimlikler, kullanıcılar ve günlük verileri korundu; ikinci çalıştırma katalog içeriğini değiştirmedi, toplam 30 ve kopya sayısı sıfır kaldı. Dolu günlük kopyası ayrıca izole gerçek PostgreSQL testinde korundu.
- Web kataloğunda mevcut API ile 20 kayıt/sayfa ve önceki/sonraki bağlantıları vardır. Bağlantılar aramayı korur; arama formu ilk sayfaya döner. Tarayıcı ve HTTP ile 20+10 benzersiz kayda erişim ve Türkçe arama doğrulandı.
- Doğrulama: 78 gerçek PostgreSQL testi, 35 web testi, Release build, web build/lint. PR #14 başarılı CI ve doğrulanan HEAD ile main'e birleşti; yerel main fast-forward güncellendi.

## Favori gıdalar (main)

- `favorite_meals` kullanıcı/gıda bileşik anahtarıyla benzersiz ilişki tutar. GET mevcut katalog sayfalamasını ve canlı besin bilgilerini kullanır; PUT/DELETE tekrar ve eşzamanlı eklemelerde güvenlidir. Kullanıcı yalnız oturumdan alınır; katalogda olmayan gıdaya PUT 404 döner. Günlük kopyaları değişmez. [Sözleşme](../backend-dotnet/docs/favorite-meals-contract.md).
- Katalog kartlarında açık favori düğmeleri ve oturumsuz giriş bağlantısı; `/favorites` içinde mevcut gramaj/tarih/öğün formuyla günlüğe ekleme. Kişisel durum yalnız özel, önbelleksiz GET geçidinden okunur; değişikliklerde iki CSRF katmanı korunur.
- AddFavoriteMeals migration'ı hedefi doğrulanan localhost PostgreSQL 17 `bite_routine` geliştirme DB'sine uygulandı; kullanıcı/katalog/günlük içerikleri önce/sonra aynı kaldı. Testler ayrı `bite_routine_test` şemalarındadır.
- Doğrulama: 88 gerçek PostgreSQL testi, 41 web testi, Release build, web build/lint, migration model kontrolü ve geçici kopyada sonraki migration scaffold/derleme. Yerel HTTP ve tarayıcıda favori ekleme/çıkarma/kalıcılık, günlük ekleme, iki kullanıcı ayrımı, CSRF ve bearer doğrulandı.
- PR #15 doğrulanan HEAD ve başarılı CI ile main'e birleşti; yerel main fast-forward güncellendi.

## Bu dal: günlük geçmişi

- PR #16'nın `d14f071` HEAD'i ve iki başarılı CI işi doğrulandı; aynı HEAD koşuluyla main'e birleşti. Yerel main fast-forward güncellendi; `feat/diary-history` buradan açıldı.
- Oturumlu `GET /me/diary-summary?endDate=yyyy-MM-dd`, bitiş dahil yedi takvim gününü artan sırada döndürür. Tek kullanıcı/aralık DB sorgusu ve mevcut snapshot/decimal günlük hesabı kullanılır; boş gün 0, eksik besin null kalır. Yeni tablo/migration yoktur.
- `/history`, mevcut İstanbul günü yardımcısı, önceki/sonraki yedi gün, günlük bağlantıları, “Kayıt yok”/“Eksik veri”, yüklenme/oturum/hata durumları ve özel önbelleksiz geçit içerir. Grafik/hedef/ortalama/sağlık yorumu eklenmedi.
- Doğrulama: 101 gerçek PostgreSQL testi (tek aralık sorgusu dahil), 45 web testi, uyarısız Release build, web build/lint ve değişiklik olmadığını bildiren migration model kontrolü. Çerezli HTTP kontrolü ekleme/düzenleme/tarih taşıma/silme sonrası geçmişi günlük özetiyle karşılaştırdı. Tarayıcıda boş/dolu günler, haftalık gezinme, günlüğe geçiş, yenileme, iki hesap ayrımı ve 375 px mobil görünüm doğrulandı.

## Sıradaki iş

Günlük geçmişi PR'ını incelemek. Yeni PR merge edilmedi; deployment yapılmadı. Migration veya manuel kurulum adımı gerekmiyor.
