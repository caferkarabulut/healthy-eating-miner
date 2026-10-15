# Günlük kayıt dilimi

## Veri kararı

`diary_entries`: UUID kimlik, Identity kullanıcı FK'sı, katalog gıda FK'sı, `date` türünde günlük günü, `numeric(8,2)` gramaj ve PostgreSQL'in `CURRENT_TIMESTAMP` ile ürettiği UTC `timestamptz` oluşturulma zamanı. Kullanıcı/gün bileşik indeksi listelemeyi destekler. Kullanıcı silinince kayıtları silinir; günlükte kullanılan katalog gıdasının silinmesi engellenir.

Gıda adı, dört nullable 100 g besin değeri ve kaynak bilgileri kayıt anında kopyalanır. Katalog sonradan değişse de geçmiş günlük değişmez. Yanıttaki besin değerleri bu kopyadan `grams / 100` oranıyla hesaplanır; eksik alanlar `null`, gerçek sıfırlar `0` kalır. Değerler yaklaşık olup günlük toplamı bu dilimde sunulmaz.

Gün, kullanıcının **Europe/Istanbul takvimindeki** seçtiği `yyyy-MM-dd` tarihidir. İstek açık tarih taşır; UTC gece yarısına veya sunucu saat dilimine dönüştürülmez. İstemci ileride “bugün” seçerken Europe/Istanbul kullanmalıdır. `createdAtUtc` kayıt zamanıdır, günlük gününü belirlemez. Geçmiş/gelecek gün seçimi serbesttir.

## HTTP sözleşmesi

Tüm uç noktalar Identity oturumu gerektirir. Kullanıcı kimliği yalnız doğrulanmış oturumdan alınır; gövdedeki tanımsız alanlar (`userId` dahil) reddedilir. Çerezli POST/PATCH/DELETE mevcut API antiforgery kontrolüne tabidir; çerezsiz mobil bearer desteklenir.

### POST `/me/diary-entries`

```json
{ "mealId": 1, "grams": 150.25, "date": "2026-10-15" }
```

`mealId` pozitif tamsayıdır. `grams` JSON sayısıdır; 0.01–10000 g aralığında ve en fazla iki ondalık basamakla kabul edilir (sessiz yuvarlama yapılmaz). `date` zorunludur. Başarılı yanıt `201` ve oluşturulan kayıttır; `Location` seçilen günün liste adresini gösterir. Tekrarlanan POST ayrı kayıt oluşturur; idempotency bu dilimde yoktur.

### GET `/me/diary-entries?date=2026-10-15`

Tarih zorunlu ve tam `yyyy-MM-dd` biçimindedir. `200` yanıtı `{ "date": "2026-10-15", "timeZone": "Europe/Istanbul", "items": [...] }` biçimindedir. Yalnız oturum kullanıcısının o gündeki kayıtları, oluşturulma zamanı/kimlik sırasıyla döner; boş gün `items: []` verir.

Kayıt alanları: `id`, `mealId`, `mealName`, `grams`, `date`, `createdAtUtc`, `nutrition` (`caloriesKcal`, `proteinG`, `carbsG`, `fatG`, `approximate: true`), `source`, `sourceId`, `sourceUrl`. Besin alanları tek tek nullable'dır; tümü eksikse de kayıt oluşturulabilir.

Hatalar: geçersiz/eksik alan veya tarih `400` (ProblemDetails), katalogda bulunmayan gıda `404`, oturumsuz istek `401`, çerezli POST/PATCH/DELETE'te eksik/geçersiz antiforgery `403`. Kullanıcı kimliği yanıta eklenmez. Web istemcisi aynı kökenli `/api/diary` geçidini kullanır; tarih, önbellek ve tekrar gönderim davranışı [web README](../../web/README.md) içindedir. Öğün türleri, günlük toplamı ve deployment kapsam dışıdır.

### PATCH `/me/diary-entries/{id}`

```json
{ "grams": 175.25, "date": "2026-10-16" }
```

Bu küçük sözleşmede iki alan birlikte zorunludur; JSON Merge Patch değildir. Oluşturmadaki sayı/aralık/iki ondalık ve tarih kuralları geçerlidir. `mealId`, `userId` veya başka alanlar kabul edilmez. Yalnız oturum kullanıcısına ait UUID kaydı düzenlenir; başkasının veya olmayan kaydın yanıtı aynı `404` olur. Başarı `200` ve güncel kayıttır. Gıda kimliği, kayıt anındaki ad, nullable 100 g besin değerleri, kaynak kopyaları ve `createdAtUtc` değişmez; yalnız gramaj ve tarih değişir. Yanıttaki porsiyon değerleri korunmuş kopyadan yeni gramajla hesaplanır.

### DELETE `/me/diary-entries/{id}`

Gövdesiz istek yalnız kullanıcının kendi kaydını siler; başarı `204` ve boş gövde, başkasının veya olmayan kayıt `404` döner. Aynı silme isteğini yeniden göndermek de `404` döner. Her iki yeni uç noktada oturumsuz istek `401`, API antiforgery bilgisi olmayan çerezli istek `403` olur; bearer akışı korunur.

Web aynı kökenli `PATCH/DELETE /api/diary/{id}` geçidini kullanır. Hem tarayıcı Origin/CSRF kontrolü hem API antiforgery çifti uygulanır; kişisel yanıtlar önbelleğe alınmaz. Web silmeden önce onay ister, işlem sürerken tekrar gönderimi engeller ve belirsiz yanıtları otomatik tekrarlamaz. Başarılı işlemden sonra seçili gün yeniden okunur; tarih değişen kayıt yeni gününde görünür. Eşzamanlı düzenlemelerde son başarılı yazım geçerlidir; bu dilimde sürüm/ETag sözleşmesi yoktur.
