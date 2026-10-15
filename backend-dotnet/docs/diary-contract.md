# Günlük kayıt dilimi

## Veri kararı

`diary_entries`: UUID kimlik, Identity kullanıcı FK'sı, katalog gıda FK'sı, `date` türünde günlük günü, `numeric(8,2)` gramaj ve PostgreSQL'in `CURRENT_TIMESTAMP` ile ürettiği UTC `timestamptz` oluşturulma zamanı. Kullanıcı/gün bileşik indeksi listelemeyi destekler. Kullanıcı silinince kayıtları silinir; günlükte kullanılan katalog gıdasının silinmesi engellenir.

Gıda adı, dört nullable 100 g besin değeri ve kaynak bilgileri kayıt anında kopyalanır. Katalog sonradan değişse de geçmiş günlük değişmez. Yanıttaki besin değerleri bu kopyadan `grams / 100` oranıyla hesaplanır; eksik alanlar `null`, gerçek sıfırlar `0` kalır. Değerler yaklaşık olarak sunulur.

Gün, kullanıcının **Europe/Istanbul takvimindeki** seçtiği `yyyy-MM-dd` tarihidir. İstek açık tarih taşır; UTC gece yarısına veya sunucu saat dilimine dönüştürülmez. İstemci ileride “bugün” seçerken Europe/Istanbul kullanmalıdır. `createdAtUtc` kayıt zamanıdır, günlük gününü belirlemez. Geçmiş/gelecek gün seçimi serbesttir.

## HTTP sözleşmesi

Tüm uç noktalar Identity oturumu gerektirir. Kullanıcı kimliği yalnız doğrulanmış oturumdan alınır; gövdedeki tanımsız alanlar (`userId` dahil) reddedilir. Çerezli POST/PATCH/DELETE mevcut API antiforgery kontrolüne tabidir; çerezsiz mobil bearer desteklenir.

### POST `/me/diary-entries`

```json
{ "mealId": 1, "grams": 150.25, "date": "2026-10-15", "mealSlot": "breakfast" }
```

`mealId` pozitif tamsayıdır. `grams` JSON sayısıdır; 0.01–10000 g aralığında ve en fazla iki ondalık basamakla kabul edilir (sessiz yuvarlama yapılmaz). `date` zorunludur. Başarılı yanıt `201` ve oluşturulan kayıttır; `Location` seçilen günün liste adresini gösterir. Tekrarlanan POST ayrı kayıt oluşturur; idempotency bu dilimde yoktur.

### GET `/me/diary-entries?date=2026-10-15`

Tarih zorunlu ve tam `yyyy-MM-dd` biçimindedir. `200` yanıtı `{ "date": "2026-10-15", "timeZone": "Europe/Istanbul", "items": [...], "summary": { "entryCount": 2, "caloriesKcal": 196.779209, "proteinG": 3.093024, "carbsG": 4.409559, "fatG": 0.83325 } }` biçimindedir. Yalnız oturum kullanıcısının o gündeki kayıtları, oluşturulma zamanı/kimlik sırasıyla döner; boş gün `items: []` verir.

Kayıt alanları: `id`, `mealId`, `mealName`, `grams`, `date`, `mealSlot`, `createdAtUtc`, `nutrition` (`caloriesKcal`, `proteinG`, `carbsG`, `fatG`, `approximate: true`), `source`, `sourceId`, `sourceUrl`. Besin alanları tek tek nullable'dır; tümü eksikse de kayıt oluşturulabilir.

Hatalar: geçersiz/eksik alan veya tarih `400` (ProblemDetails), katalogda bulunmayan gıda `404`, oturumsuz istek `401`, çerezli POST/PATCH/DELETE'te eksik/geçersiz antiforgery `403`. Kullanıcı kimliği yanıta eklenmez. Web istemcisi aynı kökenli `/api/diary` geçidini kullanır; tarih, önbellek ve tekrar gönderim davranışı [web README](../../web/README.md) içindedir. Deployment kapsam dışıdır.

### PATCH `/me/diary-entries/{id}`

```json
{ "grams": 175.25, "date": "2026-10-16", "mealSlot": "dinner" }
```

Bu küçük sözleşmede gramaj ve tarih birlikte zorunludur; JSON Merge Patch değildir. Oluşturmadaki sayı/aralık/iki ondalık ve tarih kuralları geçerlidir. `mealId`, `userId` veya başka alanlar kabul edilmez. Yalnız oturum kullanıcısına ait UUID kaydı düzenlenir; başkasının veya olmayan kaydın yanıtı aynı `404` olur. Başarı `200` ve güncel kayıttır. Gıda kimliği, kayıt anındaki ad, nullable 100 g besin değerleri, kaynak kopyaları ve `createdAtUtc` değişmez; yalnız gramaj, tarih ve isteğe bağlı `mealSlot` değişir. Yanıttaki porsiyon değerleri korunmuş kopyadan yeni gramajla hesaplanır.

### DELETE `/me/diary-entries/{id}`

Gövdesiz istek yalnız kullanıcının kendi kaydını siler; başarı `204` ve boş gövde, başkasının veya olmayan kayıt `404` döner. Aynı silme isteğini yeniden göndermek de `404` döner. Her iki yeni uç noktada oturumsuz istek `401`, API antiforgery bilgisi olmayan çerezli istek `403` olur; bearer akışı korunur.

Web aynı kökenli `PATCH/DELETE /api/diary/{id}` geçidini kullanır. Hem tarayıcı Origin/CSRF kontrolü hem API antiforgery çifti uygulanır; kişisel yanıtlar önbelleğe alınmaz. Web silmeden önce onay ister, işlem sürerken tekrar gönderimi engeller ve belirsiz yanıtları otomatik tekrarlamaz. Başarılı işlemden sonra seçili gün yeniden okunur; tarih değişen kayıt yeni gününde görünür. Eşzamanlı düzenlemelerde son başarılı yazım geçerlidir; bu dilimde sürüm/ETag sözleşmesi yoktur.

### Seçilen günün özeti

GET yanıtındaki `summary`, aynı sorgunun yalnız oturum kullanıcısı/seçilen gün için döndürdüğü `items` listesinden hesaplanır; ayrı bir katalog sorgusu veya saklanan toplam yoktur. `entryCount` tüm kayıtların sayısıdır. Dört besin toplamı, her kaydın **kayıt anındaki 100 g kopyası × gramaj / 100** değeri toplanarak decimal aritmetiğiyle üretilir; ara veya sonuç yuvarlaması yapılmaz. Web yalnız gösterimde Türkçe biçimlendirme yapar.

Boş günde `entryCount` ve dört toplam `0` olur. Herhangi bir kayıtta bir besin eksikse yalnız o alanın toplamı `null` olur; eksik alan sıfır kabul edilmez, eksiksiz diğer alanlar hesaplanır. Gerçek sıfır `0` kalır. Ekleme, gramaj düzenleme, tarih taşıma ve silmeden sonraki GET güncel özeti döndürür; tarih taşındığında her iki günün özeti değişir. Mevcut oturum/kullanıcı ayrımı ve web geçidinin `private, no-store` / `Vary: Cookie` kuralları aynen geçerlidir. Web, eksik toplamda “Eksik veri” ve kısa nedenini gösterir; hedef/öneri/grafik içermez. Toplamlar tüm öğünleri kapsar; yalnız öğün değişince besin toplamları değişmez.

### Öğün alanı ve migration

`mealSlot`, günlük kaydının kullanıcının seçtiği öğünüdür; katalogdaki `mealType` ile ilişkili değildir. API yalnız `breakfast`, `lunch`, `dinner`, `snack`, `other` değerlerini kabul eder. Null, boş, farklı harf büyüklüğü veya tanımsız değer `400` döner. POST'ta atlanırsa `other`, PATCH'te atlanırsa mevcut öğün korunur. Yanıtlar her zaman `mealSlot` taşır.

`AddDiaryMealSlot`, zorunlu `varchar(16)` `meal_slot` sütununu `other` varsayılanıyla ve izinli değer CHECK kısıtıyla ekler. Eski satırlar yalnız bu alanı kazanır; kullanıcı, tarih, gramaj, oluşturulma zamanı ve gıda/besin/kaynak kopyaları korunur. Migration öncesi bağlantının projenin geliştirme DB'si `bite_routine` olduğunu doğrulayın; test DB'sini geliştirme için kullanmayın. Gerçek PostgreSQL testi eski şemadaki dolu kaydı geçiş sonrasında yeni alan hariç JSON olarak karşılaştırır. Migration geri alındığında öğün bilgisi kaybolur.

GET liste sırası değişmez. Web boş olmayan grupları Kahvaltı → Öğle → Akşam → Ara öğün → Diğer sırasıyla gösterir; grup içindeki kayıt sırasını korur. Öğün başına toplam veya otomatik saat tahmini yoktur.

### GET `/me/diary-summary?endDate=2027-01-03`

Oturum gerektirir. Zorunlu `endDate`, mevcut tam `yyyy-MM-dd` takvim günü sözleşmesini kullanır; timestamp kabul edilmez. Yedi günün temsil edilebilmesi için en erken `0001-01-07`, en geç `9999-12-31` kabul edilir; eksik/geçersiz tarih `400`, oturumsuz istek `401` döner.

Yanıt: `{ "startDate": "2026-12-28", "endDate": "2027-01-03", "timeZone": "Europe/Istanbul", "days": [{ "date": "2026-12-28", "summary": { "entryCount": 0, "caloriesKcal": 0, "proteinG": 0, "carbsG": 0, "fatG": 0 } }, ...] }`. Bitiş günü dahil tam yedi gün, artan tarih sırasında ve kayıtsız günler dahil döner. Kayıtsız gün yalnız veri bulunmadığını belirtir; beslenmeye ilişkin bir çıkarım değildir.

Yalnız oturum kullanıcısının aralıktaki günlük kayıtları tek `AsNoTracking` DB sorgusuyla alınır; gün başına sorgu veya katalog okuması yapılmaz. Her gün mevcut `DiarySummaryResponse.From` hesabını kullanır: kayıt anındaki kopya × gramaj / 100, decimal toplama, yuvarlamasız sonuç. Eksik alan null, gerçek sıfır ve boş gün toplamı 0 kalır. Ekleme/düzenleme/tarih taşıma/silme sonraki okumada görünür. Yeni tablo/migration yoktur. API `no-store`, aynı kökenli web geçidi `private, no-store` ve `Vary: Cookie` kullanır; bearer ve HttpOnly oturum düzeni korunur.
