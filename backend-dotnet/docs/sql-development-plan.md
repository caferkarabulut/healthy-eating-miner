# Bite Routine — PostgreSQL geliştirme planı

Karar: .NET 10 + EF Core + Npgsql + PostgreSQL 17. Ürün Türkiye pazarına yöneliktir; Türkçe arama, gram/kcal ve kullanıcıya gösterilen öğün günlerinde Europe/Istanbul esas alınır. Bu belge geliştirme veritabanını anlatır. Eski Azure SQL planı geçerli değildir.

## Yerel veritabanı

`backend-dotnet/compose.yaml` PostgreSQL 17'yi yalnız `127.0.0.1:5433` üzerinde açar. `bite_routine` geliştirme veritabanı, `bite_routine_test` entegrasyon testleri içindir. `backend-dotnet/README.md` kurulum, migration, test ve HTTP komutlarını içerir. Compose kullanılamıyorsa aynı sürüm, port, veritabanı ve rol adlarıyla yerel PostgreSQL kullanılabilir.

Örnek parolalar yalnız yerel geliştirme/CI içindir. Gerçek bağlantı bilgileri Git'e yazılmaz. API'ye deploy ederken bağlantı dizesi ortam yapılandırmasından verilir; migration ayrı ve gözden geçirilmiş bir adımda uygulanır. API başlangıcı veritabanı şemasını otomatik değiştirmez.

## Şema ve migration

İlk migration `meals` tablosunu oluşturur: tamsayı ID, zorunlu yemek adı, isteğe bağlı mutfak ve öğün türü. `meal_name` için deterministik Türkçe ICU collation (`bite_routine_tr`, `tr-TR`) tanımlıdır. Arama Npgsql `ILIKE` ile yapılır; `%`, `_` ve ters eğik çizgi düz metin olarak kaçırılır. Bu davranış gerçek PostgreSQL entegrasyon testleriyle doğrulanır.

Migration'ın hedef model metadatası kendi dosyasında sabittir. Snapshot sonraki migration üretimlerinde yeniden yazılabilir. Yeni migration eklerken geçici kopyada scaffold + Release build yapılır; sonra kalıcı dalda `dotnet ef migrations has-pending-model-changes` kontrol edilir. Geliştirme veritabanında mevcut migration açıkça `dotnet ef database update --project src/BiteRoutine.Api` ile uygulanır.

## Test izolasyonu

Üçüncü migration Identity kullanıcılarını, dördüncü `AddDiaryEntries` kullanıcı/gün indeksli günlük kayıtlarını ekler. Günlük migration'ı mevcut kullanıcı ve katalog verisini değiştirmeden proje geliştirme DB'sine uygulandı. Web katalog/günlük akışı bu DB'yi kullanır; test DB'si geliştirme backend'ine bağlanmaz.

Test fixture'ı yalnız adı tam olarak `bite_routine_test` olan veritabanına bağlanır. Her fixture benzersiz bir şema açar, migration ve 25 demo kaydını orada uygular, bitince şemayı kaldırır. Testler geliştirme veritabanına veya önceden kalmış test verilerine yazmamalıdır. CI geçici PostgreSQL 17 servisi kullanır; yerel testlerde de gerçek PostgreSQL gerekir.

## Kaynaklı başlangıç verisi

İkinci migration 100 g başına kcal, protein, karbonhidrat ve yağ ile kaynak kimliği/bağlantısı alanlarını ekler. `db/seed-usda-starter.sql` sekiz temel gıdayı USDA FoodData Central'ın CC0 verisinden, açık komutla ve tekrar çalıştırılabilir biçimde ekler. Değerler yaklaşık olarak sunulur; besin nesnesi `basisGrams: 100`, `approximate: true` ve kaynak bağlantısını taşır. USDA'nın doğrudan detay URL'leri yeni sekmede 404 döndüğü için kaynak bağlantıları FDC kimliğiyle tek sonucu gösteren resmî arama sayfasına gider; seed yeniden çalıştırıldığında eski URL'leri düzeltir. Kaynak açıklaması: https://fdc.nal.usda.gov/api-guide/ . Geliştirme veritabanı migration sonrasında yine boştur; seed ayrı uygulanır.

Eski `data/healthy_eating*.csv` dosyalarının lisansı ve besin birimi doğrulanmadığından import edilmez. Geleneksel Türk yemekleri için kaynak, pişirme tarifi ve porsiyon tanımı ayrıca gerekir. Next.js katalog, yeni oturum ve günlük ekranları .NET API'sini kullanır; eski Python takip ve koçluk ekranları taşınmadı. Azure kaynakları bu planın parçası değildir.
