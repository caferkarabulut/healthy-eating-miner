# Bite Routine durum — 24 Ekim 2026

## Karar

Aktif backend .NET 10 + EF Core + Npgsql + PostgreSQL 17. Ürün Türkiye pazarına yöneliktir: Türkçe katalog/arama, gram/kcal ve kullanıcıya gösterilen öğün günlerinde Europe/Istanbul. Azure SQL planı bırakıldı.

## Tamamlanan temel

- PR #3 (`feat/postgresql-meal-catalog`): PostgreSQL yemek kataloğu, ilk migration, Türkçe ICU collation, gerçek DB testleri ve CI.
- Geliştirme DB'si migration sonrası boş başlar; 25 demo yemek yalnız test fixture'ındadır.
- İlk migration hedef metadatası snapshot'tan bağımsızdır. Testler yalnız `bite_routine_test` içinde koşu başına ayrı şema kullanır.
- İkinci migration kaynaklı, yaklaşık 100 g besin alanlarını ekler. Sekiz temel gıdalık USDA FoodData Central başlangıç verisi açık ve tekrar çalıştırılabilir seed komutuyla geliştirme veritabanına eklenir; eski CSV kullanılmaz. Kaynak bağlantıları, FDC kimliğiyle doğru kaydı gösteren resmî arama sayfasına gider.
- Next.js ana sayfası .NET API'sinden Türkçe aranabilen, kaynak bağlantılı kataloğu gösterir. Yerel HTTP kontrolü yapıldı. Eski takip ve koçluk ekranları hâlâ Python API'sini bekler; mobil istemci aşağıdaki kapsamda geliştirilmiştir.
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

## Günlük geçmişi (main)

- PR #16'nın `d14f071` HEAD'i ve iki başarılı CI işi doğrulandı; aynı HEAD koşuluyla main'e birleşti. Yerel main fast-forward güncellendi; `feat/diary-history` buradan açıldı.
- Oturumlu `GET /me/diary-summary?endDate=yyyy-MM-dd`, bitiş dahil yedi takvim gününü artan sırada döndürür. Tek kullanıcı/aralık DB sorgusu ve mevcut snapshot/decimal günlük hesabı kullanılır; boş gün 0, eksik besin null kalır. Yeni tablo/migration yoktur.
- `/history`, mevcut İstanbul günü yardımcısı, önceki/sonraki yedi gün, günlük bağlantıları, “Kayıt yok”/“Eksik veri”, yüklenme/oturum/hata durumları ve özel önbelleksiz geçit içerir. Grafik/hedef/ortalama/sağlık yorumu eklenmedi.
- Doğrulama: 101 gerçek PostgreSQL testi (tek aralık sorgusu dahil), 45 web testi, uyarısız Release build, web build/lint ve değişiklik olmadığını bildiren migration model kontrolü. Çerezli HTTP kontrolü ekleme/düzenleme/tarih taşıma/silme sonrası geçmişi günlük özetiyle karşılaştırdı. Tarayıcıda boş/dolu günler, haftalık gezinme, günlüğe geçiş, yenileme, iki hesap ayrımı ve 375 px mobil görünüm doğrulandı.

## Tek komutla yerel demo (main)

- PR #17'nin `79ee806` HEAD'i ve başarılı CI doğrulandı; aynı HEAD koşuluyla merge edildi. Yerel main fast-forward güncellendi, `chore/local-demo` buradan açıldı.
- `node scripts/local-demo.mjs`, mevcut Release API ve kurulu Next.js ile Development ortamını açar; paket kurulumu/build/test tekrar etmez. Salt okunur ön kontrol yerel PostgreSQL 17, yalnız geliştirme DB'si, migration ve kaynaklı seed varlığını doğrular; eksikte açık manuel yönlendirme verir. Veri/hesap oluşturmaz veya ayar/gizli bilgi yazdırmaz.
- Port çakışmasında mevcut süreç korunur; hazır olma sonrası adres gösterilir. SIGINT/SIGTERM ve hatalarda yalnız başlatılan süreç grupları kapatılır. [Komut ve sorun giderme](local-setup.md).
- Doğrulama: 4 başlatıcı testi, 106 backend testi, uyarısız Release build. Gerçek ortamda başlatma, API/web hazır olma, ikinci başlatmada port hatası, SIGINT sonrası iki portun boşalması; HTTP ve tarayıcıda katalog/giriş/favoriler/günlük/geçmiş akışı doğrulandı. Geçici hesaplar temizlendi, 30 katalog kaydı korundu. Model/migration ve web ekranları değişmedi.

## Kayıt hata geri bildirimi (main)

- Yeniden üretim: zayıf parola API tarafından reddediliyor, geçit tüm hataları tek mesaja indiriyor ve alan değişince eski hata kalıyordu. Düzeltilen e-posta/parolayla yenilemeden kayıt mevcut kodda da başarılı oldu; kalıcı yüklenme/CSRF kilidi gözlenmedi. CSRF her gönderimde yeniden alınıyor.
- Tanınan Identity kodları güvenli Türkçe alan mesajlarına çevrilir; ham açıklamalar/teknik ayrıntılar gönderilmez. Düzeltilen alanın hatası ve genel hata temizlenir, diğer alan hatası korunur. Başarısızlık yüklenmeyi kaldırır; eşzamanlı gönderim engellenir. Başarı sonrası zamanlı yönlendirme yerine açık Giriş yap bağlantısı vardır.
- Parola politikası, e-posta doğrulama kuralları ve uzantı kabulü değişmedi. Regresyon testi gerçek kullanılan form reducer + istemci + geçitte başarısız gönderim/düzeltme/yeniden gönderim/başarı akışını kapsar; CI HTTP smoke aynı akışı gerçek Identity ile doğrular.
- Doğrulama: 49 web testi, web build/lint; gerçek tarayıcıda zayıf parola mesajları, düzeltince temizlenme, yenilemeden başarı, .net/.technology adresleri ve açık giriş bağlantısı. İki geçici hesap temizlendi. Backend/model değişmediği için yerel backend testleri tekrarlanmadı.

## Katalog ve ilk kullanım akışı (main)

- PR #19'un `74aebb0` HEAD'i ve başarılı CI doğrulandı; aynı HEAD koşuluyla merge edildi. Yerel main fast-forward güncellendi, `ui/catalog-flow` buradan açıldı.
- Giriş, HttpOnly oturumu `/api/auth/me` üzerinden doğruladıktan sonra kataloğa döner. Katalogdaki kişisel karşılama ayrı no-store istemci okumasıyla gelir; hesap sayfası menüde kalır. Kayıt/giriş krem, beyaz ve yeşil uygulama renklerini kullanır. Favori seçimi zorunlu değildir.
- Küçük katalog kartları tam gıda adını, ayrı hazırlama bilgisini ve kısa enerjiyi gösterir. 1280 px'de beş, 1920 px'de altı sütun; 375 px'de tek sütun vardır. Gıda seçimi makrolar ve mevcut gramaj/tarih/öğün ekleme formunu yerel dialog penceresinde açar; diğer kartların boyu değişmez. Klavye/fokus ve Escape davranışı native dialog ile korunur, gönderim sırasında kapatma engellenir.
- Ortak `/sources` sayfası ve görünür katalog bağlantıları USDA/CC0, 100 g yenilebilir kısım ve yaklaşık değer bilgisini taşır. Gıdaya özel kaynak detayda kalır. Backend, DB, besin hesabı ve günlük ekranı değişmedi.
- Doğrulama: 52 web testi, build/lint, gerçek HTTP kontrolü. Tarayıcıda 375/1280/1920 px, girişten doğrulanmış katalog dönüşü/karşılama, arama/sayfalama, favori, kaynak sayfası ve 150,25 g ile günlük ekleme kontrol edildi; yatay taşma yok. Katalog/giriş ekran görüntüleri kaydedildi. Geçici test hesapları temizlendi; backend değişmediği için yerel backend testleri tekrarlanmadı.

## Kompakt günlük ve öğün toplamları (main)

- PR #20'nin `5b01277` HEAD'i ve başarılı CI doğrulandı; aynı HEAD koşuluyla merge edildi. Yerel main fast-forward güncellendi; `ui/diary-meal-summary` buradan açıldı.
- Günlük GET yanıtında sabit sırada beş `mealSummaries` vardır. Aynı kullanıcı/gün için alınan kayıtlar bellekte gruplandırılır, mevcut snapshot/gramaj/decimal toplamı yeniden kullanılır; ek DB sorgusu veya migration yoktur. Null yalnız ilgili öğün/besin alanına yayılır; günlük toplam davranışı değişmez. [Sözleşme](../backend-dotnet/docs/diary-contract.md).
- Günlük kompakt öğün listesi oldu: başlıkta öğün toplamları, satırda tam ad/hazırlama, gramaj ve kcal; detay ve düzenleme seçimle açılır. Günlük toplam da kompaktlaştı. Mevcut sıra, silme onayı, belirsiz istek kilidi, kullanıcı/CSRF ve önbellek kuralları korunur. Oluşturulma zamanı tüketim saati gibi gösterilmez; adet/porsiyon eklenmedi.
- Doğrulama: 107 gerçek PostgreSQL testi, 53 web testi, Release build, web build/lint ve gerçek HTTP smoke. Kullanıcı/gün ayrımı, tek kayıt sorgusu, öğün null/sıfır ve snapshot toplamları, gramaj/öğün/tarih taşıma/silme doğrulandı. Tarayıcıda aynı değişikliklerle iki toplamın yenilenmesi, ayrıntılar, silmeden vazgeçme/onaylama ve 375 px/masaüstü taşmasız görünüm kontrol edildi; ekran görüntüleri kaydedildi. Geçici test hesapları temizlendi.

## Kaynaklı adet ve ev ölçüleri (main)

- PR #21'in `99c44e6` HEAD'i ve başarılı CI doğrulandı; aynı HEAD koşuluyla main'e birleşti. Yerel main fast-forward güncellendi; `feat/food-portions` buradan açıldı.
- Mevcut 30 USDA kaydı incelendi; 28 gıda için 64 ayrı kaynak ölçüsü eklendi. Yoğurt/Fuji elmadaki RACC adet sayılmadı; bu gıdalar gramla kalır. Kaynak amount/gramWeight saklanır, gramsPerUnit bölmeyle hesaplanır. Boyut ve hazırlama farkları korunur. [Model, HTTP ve kaynak tablosu](../backend-dotnet/docs/food-portions-contract.md).
- Yeni tablo/migration ve kaynak kimliğiyle tekrar uygulanabilir seed; herkese açık GET /meals/{mealId}/portions. Günlük sözleşmesi ve web değişmedi.
- Doğrulama: 115 gerçek PostgreSQL testi, uyarısız Release build, pending-model kontrolü, geçici kopyada boş sonraki migration scaffold/derleme. Hedefi doğrulanan geliştirme DB'sine migration ve seed iki kez uygulandı; katalog/kullanıcı/günlük/favori içerikleri aynı kaldı. Gerçek HTTP ile tüm 30 gıda/64 ölçü, normalizasyon, boş liste ve 400/404 doğrulandı. Web değişmediği için yerel web testleri tekrarlanmadı.

## Günlükte ölçülü miktar girişi (main)

- PR #22'nin `3bb855f` HEAD'i ve iki başarılı CI işi doğrulandı; aynı HEAD koşuluyla main'e birleşti. Yerel main fast-forward güncellendi; `feat/diary-portion-input` buradan açıldı.
- Katalog, favoriler ve günlük düzenleme gram veya aynı gıdanın kaynak ölçüsünü kullanır. Türkçe virgül/kesirli adet, boyut ayrımları, yaklaşık gram/besin önizlemesi; ölçü yok/hata durumunda gram desteği vardır. [Web akışı](../web/docs/portion-input.md).
- API grams ile geriye uyumludur; ölçülü portionId/quantity sunucuda doğrulanır ve decimal dönüşüm nihai gramda iki ondalığa AwayFromZero ile normalize edilir. Günlükte nullable JSONB ölçü kopyası korunur. Tarih/öğün-only PATCH miktarı tekrar hesaplamaz. [Sözleşme](../backend-dotnet/docs/diary-contract.md).
- Doğrulama: 122 gerçek PostgreSQL testi, 60 web testi, uyarısız Release build, web build/lint, pending-model kontrolü ve geçici kopyada boş sonraki migration scaffold/derleme. Gerçek HTTP ve 375 px tarayıcı akışları başarılı. Migration yalnız doğrulanan geliştirme DB'sine uygulandı; eski katalog/kullanıcı/günlük/favoriler korundu. Geçici test hesabı temizlendi.

## İlk mobil katalog (main)

- PR #23'ün `4b70e35` HEAD'i değişmemişti; başarılı CI ve aynı HEAD koşuluyla main'e birleşti. Yerel main fast-forward güncellendi; `feat/mobile-catalog` açıldı. Başlangıçta çalışma ağacı temizdi.
- `mobile/`: resmî kararlı Expo SDK 58 / React Native 0.88 / React 19.3 ve Node 24. Mevcut .NET API'ye ortam adresiyle salt okunur erişim; Türkçe arama, sayfalama ve 100 g detay. Krem/yeşil, güvenli alan, kaydırılabilir arama/klavye düzeni, yüklenme/boş/hata/tekrar deneme. Giriş/günlük/favori/onboarding yok.
- 9 React Native bileşen/istemci testi, TypeScript, lint, SDK paket uyumluluğu ve iOS Metro paketlemesi geçti. Gerçek yerel API ile 30 gıda, Türkçe arama, sayfalama, detay ve hata HTTP kontrolü geçti; veri değiştirilmedi. Mobil CI ayrı eklendi, backend/web ve kök README/About değişmedi; eski yerel testler tekrarlanmadı.
- İlk teslimde eksik olan Xcode/Simulator kullanıcı tarafından kuruldu. **Kullanıcı doğrulaması:** Simulator’da liste, Türkçe arama, detay, geri dönüş, sayfalama ve boş sonuç çalışıyor. Bu sonuç kullanıcı doğrulamasıdır. PR #24’ün değişmeyen `6f0b9ec` HEAD’i ve aynı HEAD’in başarılı mobil CI’ı kontrol edilip aynı HEAD koşuluyla merge edildi; yerel main fast-forward güncellendi. Dolaylı bağımlılık uyarıları değerlendirildi; [mobil README](../mobile/README.md) içinde korunuyor.

## Mobil oturum (main)

- `feat/mobile-session`, güncel main’den açıldı. Kayıt/giriş/hesap/yerel çıkış, SDK uyumlu SecureStore, açılışta geri yükleme, tek eşzamanlı yenileme ve çıkış sonrası geç yanıt/yazma koruması eklendi. Ağ/5xx hatası oturumu silmez; geçersiz yenileme temizler. Katalog oturumsuz kalır; mobil günlük/favori/onboarding yoktur.
- Mevcut Identity bearer opaktır, JWT varsayılmaz. Çıkış yalnız cihaz tokenlarını temizler; sunucuda token iptali/diğer cihazlardan çıkış sağlamaz. [Sözleşme ve doğrulama](../mobile/docs/session.md).
- 29 mobil test, TypeScript/lint/SDK uyumu ve iOS paketlemesi; gerçek API ile kayıt/hatalı giriş/giriş/hesap/refresh/yerel çıkış ve geçersiz yenileme doğrulandı. Native Simulator’da klavye, hata düzeltme, tam kapatıp açma sonrası SecureStore geri yükleme, çıkış ve geçersiz oturum ekranı kontrol edildi. Geçici hesaplar güvenli biçimde temizlendi. Backend/web değişmedi; eski testleri yerelde tekrarlanmadı.

## Mobil günlük (main)

- PR #25’in `4c7ff5d` HEAD’i ve başarılı CI son kez incelenip aynı HEAD koşuluyla main’e birleşti. Yerel main `5a12eea` fast-forward güncellendi; `feat/mobile-diary` buradan açıldı. Çalışma ağacı başlangıçta temizdi. Samsung/iPhone oturum kabulü ve geçici CA temizliği kullanıcı doğrulaması olarak kaydedildi.
- Mevcut API ile seçilen günün listesi, katalog detayından gram/kaynaklı kesirli adetle ekleme, gün/öğün seçimi, sabit öğün grupları ve sunucunun günlük/öğün toplamları. İstanbul günü, null/sıfır, tek refresh, hesap/tarih yarış koruması, çift gönderim ve belirsiz POST kilidi korunur. Backend/model/migration/web değişmedi.
- Mobil testler, TypeScript/lint/SDK uyumu, Android/iOS Metro paketleme; gerçek API ve iOS 27.1 Simulator’da gram/adet, gün/öğün/toplamlar, yeniden açılış, boş gün, bağlantı hatası/toparlanma ve iki hesap ayrımı doğrulandı. Sentetik hesaplar/kayıtlar temizlendi, yalnız geçici Simulator süreçleri kapatıldı. [Kapsam ve kanıt ayrımı](../mobile/docs/diary.md).

## Mobil günlük düzenleme/silme (main)

- PR #26’nın değişmeyen `4acf4a0` HEAD’i başarılı CI ve aynı HEAD koşuluyla birleşti. Yerel main `bdc97f2` fast-forward; aktif dal `feat/mobile-diary-edit`. Başlangıçta çalışma ağacı temizdi.
- Mevcut PATCH/DELETE ile gram/kesirli adet, gün/öğün, native silme onayı ve toplam yenileme. Tam kayıtlı ölçü kopyası kullanılır; tarih/öğün-only PATCH miktarı atlar. Değişmiş/kaldırılmış ölçüye sessiz geçilmez; miktar için gram/güncel ölçü açıkça seçilir. Çift/belirsiz işlem ve geç hesap/tarih yanıtları korunur.
- 61 test, TypeScript/lint/SDK uyumu, Android/iOS Metro paketleme; gerçek API ve iOS 27.1 Simulator’da düzenleme/taşıma/iptal/onaylı silme/toplamlar doğrulandı. Sentetik hesaplar/kayıtlar temizlendi. Backend/web/model/migration ve kök README/About değişmedi.
- Geçici Simulator Metro kapatıldı; eski iPhone testinin özel anahtarları temizlendi. Kullanıcı iPhone’daki **Bite Routine Temporary Device Test CA** profilini kaldırdığını doğruladı. [Kanıt ve kabul listesi](../mobile/docs/diary-edit.md).

## Ücretsiz telefon testi ve mobil favoriler

- PR #27 `195fc79` başarılı CI ve aynı HEAD koşuluyla merge commit olarak birleşti (`70f805d`). PR #28 main'e alındı; yalnız araç/belge farkı ve yeni base CI kontrol edildi. Araç PR'ındaki gereksiz mobil README değişikliği çıkarıldı; `20da461` başarılı araç CI ile merge edildi (`53b4563`). Yerel main fast-forward güncellendi; yeni dal `feat/mobile-favorites`.
- Ürün yalnız iOS/Android. Ücretli staging/EAS hazırlığı ayrı `mobile-staging` worktree'de ertelenmiş olarak korunur; ana checkout yerel değişikliklerine dokunulmadı. Yeni backend/migration/web özelliği yoktur.
- Mobil katalog/detaydan favoriye ekleme/çıkarma, kişisel favori listesi ve mevcut gram/adet günlük formuna geçiş eklendi. Hesap/oturum değişince bellek ayrılır; çift gönderim, geç yanıt ve belirsiz işlem korumaları vardır. [Sözleşme ve kabul](../mobile/docs/favorites.md).
- Ücretsiz test geçidine yalnız gerekli favori GET/PUT/DELETE yolları eklendi. Sentetik hesap/bearer/route sınırları korunur. Kullanım: `node scripts/mobile-test.mjs`; yeni origin yeniden giriş gerektirebilir. [Araç](mobile-local-test.md).
- 71 mobil test, TypeScript/lint, SDK uyumu, iki platform Metro paketlemesi ve 9 araç testi geçti. SDK'nın önerdiği uyumlu düzeltmeler Expo 58.0.19/dev-client 58.0.15/router 58.0.26 olarak eşlendi. Yeni native modül yoktur. Gerçek HTTPS API'de favori ekleme/çıkarma, kalıcılık ve iki hesap ayrımı doğrulandı; sentetik HTTP hesapları temizlendi. Backend değişmediği için tüm backend testleri tekrarlanmadı.
- Önceki PR #27 ve ücretsiz tünel iPhone kabulü **kullanıcı doğrulamasıyla tamam**; geçici CA kullanıcı tarafından kaldırıldı. Yeni favori özelliğinin fiziksel iPhone kabulü ayrıca bekler. Samsung fiziksel kabulü **cihaz mevcut değil — bekliyor**, yayın öncesi kontrol olarak korunur. Simulator ve fiziksel cihaz kanıtları ayrı tutulur.

- iOS 27.1 iPhone Duo Simulator’da favori ekleme/çıkarma, tam kapat/aç sonrası kalıcılık, favoriden 100 g günlük kaydı ve 143 kcal toplamı, boş liste ve çıkış sonrası giriş gereği native ekranda doğrulandı. İki hesap ayrımı gerçek API ve RN testleriyle doğrulandı; Simulator’da ikinci hesapla tam geçiş yapılmış sayılmaz. Simulator sentetik hesapları/kayıtları temizlendi; kendi API/Metro ve Simulator kapatıldı, tünel açık bırakılmadı. Önceden açık API/PostgreSQL korundu.
