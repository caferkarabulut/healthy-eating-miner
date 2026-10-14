# Bite Routine — Yemek Kataloğu API Sözleşmesi (İlk Dilim)

Bu belge, Bite Routine projesinde yemek kataloğu okuma işlemlerinin ilk dilimi için tasarlanan REST API sözleşmesini, mevcut Python backend davranışı ile farklarını ve veri modeliyle ilgili tespit edilen belirsizlikleri tanımlar.

---

## 1. Mevcut Python API vs. Planlanan .NET API

| Özellik | Mevcut Python API (`FastAPI`) | Planlanan .NET API (`ASP.NET Core`) |
|---|---|---|
| **Endpoint'ler** | Yalnızca `GET /meals` | `GET /meals` ve `GET /meals/{mealId}` |
| **Yetkilendirme** | Oturum zorunlu (`user_id` token bağımlılığı) | **Anonim** (Katalog okuma herkese açık) |
| **Sayfalama** | Sayfalama yok; yalnızca `limit` (varsayılan 50, üst sınır 10.000) | Standart sayfalama: `page` (varsayılan 1), `pageSize` (varsayılan 20, sınır 1–100) |
| **Sıralama** | Belirtilmemiş (ORDER BY yok, veritabanı doğal sırası, sıra garantisi yok) | `mealId` artan (ascending) |
| **Arama / Filtre** | `search` (büyük/küçük harf duyarsız `ilike`), kalori, protein ve meal_type filtreleri | İlk dilimde yalnızca `search` (yemek adına uygulanır, baştaki/sondaki boşluklar temizlenir) |
| **Yanıt Formatı** | Düz JSON dizisi (`[]`), `snake_case` alan adları | Sarmalanmış JSON nesnesi (`{ items, page, pageSize, totalCount }`), `camelCase` alan adları |
| **Tek Kayıt Sorgusu** | Mevcut değil | `GET /meals/{mealId}` (pozitif ID, bulunamazsa 404) |

> **İstemci Uyumluluk Notu:** Yeni sözleşme `camelCase` alan adları ve sayfalanmış yanıt yapısı kullanır. `web/` ana sayfasındaki açık katalog bu .NET API'sine bağlıdır. Eski oturum, takip ve koçluk ekranları Python API yapısına göre çalışır.

---

## 2. Veri Belirsizliği ve Besin Değerleri Kararı

Kaynak veri ve eski modeller incelendiğinde şu uyumsuzluklar tespit edilmiştir:
1. `data/healthy_eating_clean.csv` dosyasında `serving_size_g` (porsiyon gramajı) sütunu yer almaktadır.
2. Ancak eski Python `Meal` veritabanı modelinde (`backend/app/db/models.py`) `serving_size_g` alanı tanımlanmamıştır.
3. CSV'deki kalori ve makro değerlerinin (protein, karbonhidrat, yağ vb.) **100 gram başına mı yoksa porsiyon başına mı** hesaplandığı doğrulanmamıştır.

**Güncel karar:** Eski CSV'den besin değeri alınmaz. İkinci dilimde, USDA FoodData Central kaynağı belirtilen temel gıdalar için yaklaşık 100 g değerleri isteğe bağlı `nutrition` nesnesinde sunulur. Kaynaksız demo kayıtlarda `nutrition: null` döner. Hazırlanmış Türk yemeklerinin besin hesabı ve porsiyonları bu kapsamda değildir.

---

## 3. İlk Dilim API Sözleşmesi

### 3.1. `GET /meals` (Katalog Listeleme ve Arama)

- **Yetkilendirme:** Anonim (herkese açık).
- **Query Parametreleri:**
  - `search` *(string?, opsiyonel)*: Yemek adı içinde aranacak metin. Baş ve sondaki boşluklar temizlenir (`trim`). Boş bırakılırsa veya yalnızca boşluk içerirse filtreleme uygulanmaz, tüm kayıtlar sayfalanır. Arama metni verildiğinde PostgreSQL `ILIKE` ve Türkçe ICU sıralamasıyla büyük/küçük harf duyarsız alt metin eşleşmesi aranır (`İ/i`, `I/ı`). `%` ve `_` düz metin olarak aranır.
  - `page` *(int, opsiyonel, varsayılan: `1`)*: Pozitif `Int32` sayfa numarası (`1 <= page <= 2147483647`).
  - `pageSize` *(int, opsiyonel, varsayılan: `20`)*: Sayfa başına kayıt sayısı (`1 <= pageSize <= 100`).
- **Sıralama:** `mealId` artan sırada (ascending).
- **Sayfalama Mantığı ve Toplam:** `totalCount`, arama filtresi uygulandıktan sonra fakat sayfalama (skip/take) yapılmadan önceki eşleşen toplam kayıt sayısıdır. Sayfa dışı veya sonuçsuz sorgularda `items: []` dönerken `totalCount` filtreyle eşleşen toplamı doğru yansıtır.
- **HTTP Durum Kodları:**
  - `200 OK`: Başarılı sorgu (eşleşme yoksa veya sayfa sınırı aşılmışsa `items: []` döner).
  - `400 Bad Request`: Geçersiz parametreler (`page < 1`, `pageSize < 1`, `pageSize > 100` veya nümerik/Int32 olmayan değerler).

#### Örnek Liste Yanıtı (`200 OK`)
*(Not: Aşağıdaki veriler sözleşmeyi örneklendirme amaçlıdır; iki kayıt gösteren örnekte `totalCount: 2` yer alır.)*

```json
{
  "items": [
    {
      "mealId": 1,
      "mealName": "Kid Pasta",
      "cuisine": "Indian",
      "mealType": "Lunch",
      "nutrition": null
    },
    {
      "mealId": 2,
      "mealName": "Husband Rice",
      "cuisine": "Mexican",
      "mealType": "Lunch",
      "nutrition": null
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalCount": 2
}
```

*Not:* `cuisine` veya `mealType` verisi bilinmiyorsa `null` döner:
```json
{
  "mealId": 3,
  "mealName": "Simple Snack",
  "cuisine": null,
  "mealType": null,
  "nutrition": null
}
```

#### Örnek Boş / Sayfa Dışı Liste Yanıtı (`200 OK`)

```json
{
  "items": [],
  "page": 99,
  "pageSize": 20,
  "totalCount": 2
}
```

---

### 3.2. `GET /meals/{mealId}` (Tekil Yemek Detayı)

- **Yetkilendirme:** Anonim (herkese açık).
- **Yol Parametresi:**
  - `mealId` *(int, zorunlu)*: Pozitif `Int32` tamsayı (`1 <= mealId <= 2147483647`).
- **HTTP Durum Kodları:**
  - `200 OK`: Kayıt bulundu.
  - `400 Bad Request`: Geçersiz ID formatı (`0`, negatif sayı, `abc` veya `Int32` sınırları dışındaki değerler).
  - `404 Not Found`: Pozitif fakat veritabanında karşılığı bulunmayan `mealId`.

#### Örnek Tek Kayıt Yanıtı (`200 OK`)
*(Not: Aşağıdaki veri sözleşmeyi örneklendirme amaçlıdır.)*

```json
{
  "mealId": 1,
  "mealName": "Kid Pasta",
  "cuisine": "Indian",
  "mealType": "Lunch",
  "nutrition": null
}
```

Kaynaklı bir temel gıdada `nutrition` alanı `basisGrams: 100`, `caloriesKcal`, `proteinG`, `carbsG`, `fatG`, `source`, `sourceUrl` ve `approximate: true` içerir. Değerler pişirme durumuna bağlıdır; örneğin sade pişmiş pirinç tereyağlı pilavın değeri olarak sunulmaz. USDA veri kullanımı ve 100 g birimi için [FoodData Central API kılavuzu](https://fdc.nal.usda.gov/api-guide/) ile [alan tanımları](https://fdc.nal.usda.gov/portal-data/external/dataDictionary) esas alınır.

---

## 4. Gerekli Test Senaryoları

Bu sözleşme uygulandığında doğrulanması gereken minimum test senaryoları:

1. **Varsayılan Sayfalama:** `GET /meals` çağrıldığında varsayılan olarak `page=1`, `pageSize=20` uygulanmalı ve `200 OK` dönmelidir.
2. **Özel Sayfalama:** `page` ve `pageSize` parametreleri sınırları dahilinde verildiğinde doğru sayıda öğe ve doğru sayfalama metadataları (`items`, `page`, `pageSize`, `totalCount`) dönmelidir.
3. **Arama ve Boşluk Temizleme (Trim):** `search="  pAsTa  "` değeri verildiğinde baştaki ve sondaki boşluklar temizlenmeli, büyük/küçük harf duyarsız olarak adında "pasta" geçen kayıtlar listelenmelidir.
4. **Boş / Yalnız Boşluk Araması:** `search=""` veya `search="   "` verildiğinde filtreleme yapılmamalı, tüm kayıtlar sayfalanmalıdır.
5. **Eşleşmeyen Arama:** Sistemde bulunmayan bir ifade arandığında `200 OK`, `items: []` ve `totalCount: 0` dönmelidir.
6. **Kayıt Bulunmayan Sayfa / Uç Değerler:** Toplam kayıt sayısını aşan bir sayfa veya `page=2147483647&pageSize=100` istendiğinde, taşma hatası olmaksızın `200 OK`, `items: []` ve geçerli `totalCount` dönmelidir.
7. **Geçersiz Sayfalama Parametreleri:** `page=0`, `page=-1`, `pageSize=0`, `pageSize=101` veya alfabetik parametreler için `400 Bad Request` dönmelidir.
8. **Mevcut Tek Kayıt:** Geçerli ve var olan bir `mealId` için `GET /meals/{mealId}` çağrıldığında `200 OK` ve doğru DTO alanları (`mealId`, `mealName`, `cuisine`, `mealType`) dönmelidir.
9. **Bulunamayan Tek Kayıt:** Pozitif fakat veritabanında olmayan bir `mealId` için `GET /meals/{mealId}` çağrıldığında `404 Not Found` dönmelidir.
10. **Geçersiz ID ile Tek Kayıt:** `mealId` sıfır, negatif, `abc` veya `Int32` dışı olduğunda `400 Bad Request` dönmelidir.
11. **Null Alan Güvenliği:** `cuisine` ve `mealType` alanları boş olan kayıtlarda JSON çıktısında bu alanlar `null` olarak güvenle yer almalıdır.

