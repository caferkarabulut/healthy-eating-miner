# Kaynaklı gıda ölçüleri

## Kapsam ve kaynak

16 Ekim 2026 tarihinde mevcut 30 kataloğun aynı FDC kimliklerine ait resmî Food Details yanıtları incelendi. 28 gıda için 64 adet/ev ölçüsü seçildi. Çiğ/pişmiş ve farklı gıda kayıtları arasında ölçü aktarılmaz. Kaynağın küçük/orta/büyük ayrımı korunur; ortalama ağırlık üretilmez. Günlükte ölçü seçimi ve kayıt anındaki dönüşüm kopyası [günlük sözleşmesinde](diary-contract.md) açıklanır.

- [USDA API rehberi ve CC0](https://fdc.nal.usda.gov/api-guide/): `/fdc/v1/foods`, full yanıt.
- [Resmî alan tanımları](https://fdc.nal.usda.gov/docs/Download_Field_Descriptions_Oct2020.pdf), food_portion (s. 6): amount ölçü adedi, gram_weight bu miktarın toplam gramıdır. SR Legacy ölçü açıklaması modifier içindedir; `undetermined` tek başına ölçü adı değildir.
- [Önceki katalog eşlemesi ve 100 g kuralları](usda-catalog-sources.md) geçerlidir. Besin değerleri değişmez.
- [İncelenen kaynak alanları ve seçim gerekçeleri](../db/sources/usda-food-portions.json), tüm 30 kaydın kabul/eleme kararlarını taşır. Kaynağın özgün açıklaması API'de ayrıca korunur.

USDA cup, tbsp ve tsp ölçüleridir; Türk su bardağına veya bütün gıdalarda ortak bir hacim/gram oranına dönüştürülmez. Gramlar ilgili kaydın yenilebilir kısmına aittir. RACC bir adet veya ev ölçüsü değildir: sade yoğurt (2259793) ve Fuji elma (1750340) için yalnız RACC bulunduğundan ölçü listesi boştur; gram kullanılmaya devam edilir. Pirinçte miktarı belirtilmeyen kayıt alınmadı; `1 cup, cooked` açıklamasındaki açık 1 miktarı kullanıldı. Diğer seçilmeyen kaynak ölçüleri ilk kapsamın dışında bırakıldı; yerlerine varsayımsal ölçü eklenmedi.

## Model ve hesap

`food_portions`: gıdaya FK, Türkçe measureName, kaynak amount ve gramWeight, source/sourceFoodId/sourceId, özgün sourceDescription ve sourceUrl. Kaynak ve ölçü kimliği birlikte benzersizdir. Pozitif miktar/gram zorunludur; numeric(18,8) kaynak değerleri saklar.

`gramsPerUnit = gramWeight / amount`; seçilen birimden q adet için `grams = q × gramsPerUnit`. API decimal bölme yapar, ayrıca yuvarlamaz. amount kaynak toplamını açıklamak içindir; gramsPerUnit ile tekrar bölünmez. Örneğin tavuk göğsünde 0,5 göğüs = 86 g → 1 göğüs 172 g; soğanda 10 halka = 60 g → 1 halka 6 g. Bu kaynak oranının normalizasyonudur, yeni ortalama tahmini değildir. Fiziksel gıdalar değişken olduğu için her ölçü approximate=true taşır.

## HTTP sözleşmesi

Herkese açık `GET /meals/{mealId}/portions`:

```json
{"mealId":1,"items":[{"id":1,"mealId":1,"measureName":"Büyük adet","amount":1,"gramWeight":50,"gramsPerUnit":50,"approximate":true,"source":"USDA FoodData Central","sourceFoodId":"171287","sourceId":"88374","sourceDescription":"large","sourceUrl":"https://fdc.nal.usda.gov/food-search?type=SR%20Legacy&query=171287"}]}
```

Örnek kimlikler temsili yerel kimliklerdir; kaynak kimlikleri sabittir. Liste yerel ölçü kimliği sırasındadır. Mevcut gıdanın doğrulanmış ölçüsü yoksa 200 ve boş items; olmayan gıda 404, pozitif olmayan/geçersiz kimlik 400 döner. Günlük API'si geriye uyumlu gram girişine ek olarak portionId ve quantity kabul eder; dönüşümü sunucu yapar.

## Uygulama ve güvenlik

Önce bağlantının yerel PostgreSQL 17 `bite_routine` geliştirme DB'si olduğunu doğrulayın; `bite_routine_test` geliştirme için kullanılmaz. [Yerel kurulum](../../docs/local-setup.md) bağlantı ayarlarını açıklar. Gizli değerleri komut çıktısında paylaşmayın.

`backend-dotnet/` içinde migration: `ASPNETCORE_ENVIRONMENT=Development DOTNET_ENVIRONMENT=Development dotnet ef database update --project src/BiteRoutine.Api --configuration Release`.

Ardından mevcut yerel psql bağlantı ayarlarınızla `psql -X -v ON_ERROR_STOP=1 -f db/seed-usda-portions.sql` çalıştırın. Seed otomatik başlangıç işlemi değildir. Önce katalog seed'i mevcut olmalıdır. Kaynak FDC kimliğiyle mevcut gıdaya bağlanır; mevcut gıda kimliğini, kullanıcıyı, favoriyi veya günlük kopyasını değiştirmez. İkinci çalıştırma ölçü kimliğini koruyarak kaynak alanlarını günceller. Kaynak ölçü başka bir gıdaya atanmışsa bütün işlem geri alınır.

## Doğrulanan ölçüler

Aşağıda amount ve gramWeight doğrudan kaynak toplamlarıdır; son sütun bir ölçü için normalize gramdır. Gıdaya ait resmî bağlantı ve özgün İngilizce açıklama kanıt JSON'unda bulunur.

| Gıda | FDC | Ölçü ID | Ölçü | amount | gramWeight | g / birim |
|---|---|---|---|---:|---:|---:|
| Yumurta (çiğ) | 171287 | 88374 | Büyük adet | 1.0 | 50.0 | 50 |
| Yumurta (çiğ) | 171287 | 88375 | Çok büyük adet (extra large) | 1.0 | 56.0 | 56 |
| Yumurta (çiğ) | 171287 | 88376 | Jumbo adet | 1.0 | 63.0 | 63 |
| Yumurta (çiğ) | 171287 | 88378 | Orta adet | 1.0 | 44.0 | 44 |
| Yumurta (çiğ) | 171287 | 88379 | Küçük adet | 1.0 | 38.0 | 38 |
| Mercimek (haşlanmış, tuzsuz) | 172421 | 90596 | cup (USDA ölçüsü) | 1.0 | 198.0 | 198 |
| Mercimek (haşlanmış, tuzsuz) | 172421 | 90597 | Yemek kaşığı (USDA tbsp) | 1.0 | 12.3 | 12.3 |
| Nohut (haşlanmış, tuzsuz) | 173757 | 93226 | cup (USDA ölçüsü) | 1.0 | 164.0 | 164 |
| Beyaz pirinç (pişmiş, yağ eklenmemiş) | 2708408 | 302892 | cup, pişmiş (USDA ölçüsü) | 1 | 158 | 158 |
| Tavuk göğsü (derisiz, fırınlanmış) | 171477 | 88817 | cup, doğranmış veya küp (USDA ölçüsü) | 1.0 | 140.0 | 140 |
| Tavuk göğsü (derisiz, fırınlanmış) | 171477 | 88819 | Göğüs, kemiksiz ve derisiz | 0.5 | 86.0 | 172 |
| Domates (çiğ) | 170457 | 86682 | cup, doğranmış veya dilimli (USDA ölçüsü) | 1.0 | 180.0 | 180 |
| Domates (çiğ) | 170457 | 86685 | Büyük adet (3 inç çap) | 1.0 | 182.0 | 182 |
| Domates (çiğ) | 170457 | 86686 | Orta adet (2-3/5 inç çap) | 1.0 | 123.0 | 123 |
| Domates (çiğ) | 170457 | 86687 | Orta dilim (1/4 inç kalınlık) | 1.0 | 20.0 | 20 |
| Domates (çiğ) | 170457 | 86689 | Küçük adet (2-2/5 inç çap) | 1.0 | 91.0 | 91 |
| Süt (%3,25 yağlı, D vitamini eklenmiş) | 171265 | 88314 | cup (USDA ölçüsü) | 1.0 | 244.0 | 244 |
| Süt (%3,25 yağlı, D vitamini eklenmiş) | 171265 | 88316 | Yemek kaşığı (USDA tbsp) | 1.0 | 15.0 | 15 |
| Feta peyniri | 173420 | 92489 | cup, ufalanmış (USDA ölçüsü) | 1.0 | 150.0 | 150 |
| Yulaf (pişirilmemiş) | 169705 | 85379 | cup (USDA ölçüsü) | 1.0 | 156.0 | 156 |
| Bulgur (pişmiş) | 170287 | 86370 | cup (USDA ölçüsü) | 1.0 | 182.0 | 182 |
| Bulgur (pişmiş) | 170287 | 86371 | Yemek kaşığı (USDA tbsp) | 1.0 | 8.4 | 8.4 |
| Tam buğday ekmeği (ticari) | 172688 | 91108 | Dilim | 1.0 | 32.0 | 32 |
| Makarna (kuru, zenginleştirilmemiş) | 168927 | 84000 | cup, spagetti (USDA ölçüsü) | 1.0 | 91.0 | 91 |
| Makarna (kuru, zenginleştirilmemiş) | 168927 | 84003 | cup, penne (USDA ölçüsü) | 1.0 | 95.0 | 95 |
| Atlantik somonu (çiftlik, çiğ) | 175167 | 95787 | Fileto | 0.5 | 198.0 | 396 |
| Sığır kıyması (%15 yağlı, yassı parça, üstten ızgara) | 174032 | 93666 | Yassı parça (1/4 lb çiğ etten pişmiş verim) | 1.0 | 77.0 | 77 |
| Patates (çiğ, kabuklu) | 170026 | 85917 | cup, küp doğranmış (USDA ölçüsü) | 0.5 | 75.0 | 150 |
| Patates (çiğ, kabuklu) | 170026 | 85918 | Büyük adet (3–4-1/4 inç çap) | 1.0 | 369.0 | 369 |
| Patates (çiğ, kabuklu) | 170026 | 85919 | Orta adet (2-1/4–3-1/4 inç çap) | 1.0 | 213.0 | 213 |
| Patates (çiğ, kabuklu) | 170026 | 85920 | Küçük adet (1-3/4–2-1/2 inç çap) | 1.0 | 170.0 | 170 |
| Havuç (çiğ) | 170393 | 86559 | Orta adet | 1.0 | 61.0 | 61 |
| Havuç (çiğ) | 170393 | 86560 | Küçük adet (5-1/2 inç uzunluk) | 1.0 | 50.0 | 50 |
| Salatalık (çiğ, kabuklu) | 168409 | 83049 | cup, dilimli (USDA ölçüsü) | 0.5 | 52.0 | 104 |
| Salatalık (çiğ, kabuklu) | 168409 | 83050 | Adet (8-1/4 inç uzunluk) | 1.0 | 301.0 | 301 |
| Kuru soğan (çiğ) | 170000 | 85858 | Büyük adet | 1.0 | 150.0 | 150 |
| Kuru soğan (çiğ) | 170000 | 85860 | Orta adet (2-1/2 inç çap) | 1.0 | 110.0 | 110 |
| Kuru soğan (çiğ) | 170000 | 85862 | Küçük adet | 1.0 | 70.0 | 70 |
| Kuru soğan (çiğ) | 170000 | 85864 | Halka | 10.0 | 60.0 | 6 |
| Brokoli (çiğ) | 170379 | 86528 | cup, doğranmış (USDA ölçüsü) | 1.0 | 91.0 | 91 |
| Ispanak (çiğ) | 168462 | 83132 | cup (USDA ölçüsü) | 1.0 | 30.0 | 30 |
| Ispanak (çiğ) | 168462 | 83134 | Yaprak | 1.0 | 10.0 | 10 |
| Muz (çiğ) | 173944 | 93513 | Çok küçük adet (6 inçten kısa) | 1.0 | 81.0 | 81 |
| Muz (çiğ) | 173944 | 93514 | Küçük adet (6–6-7/8 inç uzunluk) | 1.0 | 101.0 | 101 |
| Muz (çiğ) | 173944 | 93515 | Orta adet (7–7-7/8 inç uzunluk) | 1.0 | 118.0 | 118 |
| Muz (çiğ) | 173944 | 93516 | Büyük adet (8–8-7/8 inç uzunluk) | 1.0 | 136.0 | 136 |
| Muz (çiğ) | 173944 | 93517 | Çok büyük adet (en az 9 inç uzunluk) | 1.0 | 152.0 | 152 |
| Portakal (çiğ) | 169097 | 84228 | Büyük adet (3-1/16 inç çap) | 1.0 | 184.0 | 184 |
| Portakal (çiğ) | 169097 | 84229 | Küçük adet (2-3/8 inç çap) | 1.0 | 96.0 | 96 |
| Portakal (çiğ) | 169097 | 84230 | Adet (2-5/8 inç çap) | 1.0 | 131.0 | 131 |
| Çilek (çiğ) | 167762 | 81923 | Çok büyük adet (1-5/8 inç çap) | 1.0 | 27.0 | 27 |
| Çilek (çiğ) | 167762 | 81924 | Büyük adet (1-3/8 inç çap) | 1.0 | 18.0 | 18 |
| Çilek (çiğ) | 167762 | 81925 | Orta adet (1-1/4 inç çap) | 1.0 | 12.0 | 12 |
| Çilek (çiğ) | 167762 | 81927 | Küçük adet (1 inç çap) | 1.0 | 7.0 | 7 |
| Zeytinyağı (salata veya pişirme için) | 171413 | 88667 | Yemek kaşığı (USDA tablespoon) | 1.0 | 13.5 | 13.5 |
| Zeytinyağı (salata veya pişirme için) | 171413 | 88668 | cup (USDA ölçüsü) | 1.0 | 216.0 | 216 |
| Zeytinyağı (salata veya pişirme için) | 171413 | 88669 | Çay kaşığı (USDA tsp) | 1.0 | 4.5 | 4.5 |
| Badem (iç) | 170567 | 86868 | Badem içi, adet | 1.0 | 1.2 | 1.2 |
| Ceviz (İngiliz cevizi, iç) | 170187 | 86201 | cup, doğranmış (USDA ölçüsü) | 1.0 | 117.0 | 117 |
| Ceviz (İngiliz cevizi, iç) | 170187 | 86204 | cup, kabuksuz (50 yarım; USDA ölçüsü) | 1.0 | 100.0 | 100 |
| Mercimek (kuru, pişirilmemiş) | 172420 | 90594 | cup (USDA ölçüsü; kuru) | 1.0 | 192.0 | 192 |
| Mercimek (kuru, pişirilmemiş) | 172420 | 90595 | Yemek kaşığı (USDA tablespoon; kuru) | 1.0 | 12.0 | 12 |
| Beyaz fasulye (kuru, pişirilmemiş) | 175202 | 95836 | cup (USDA ölçüsü; kuru) | 1.0 | 202.0 | 202 |
| Beyaz fasulye (kuru, pişirilmemiş) | 175202 | 95837 | Yemek kaşığı (USDA tbsp; kuru) | 1.0 | 12.6 | 12.6 |

## Doğrulama

115 gerçek PostgreSQL testi: ilişki/pozitif değerler/benzersizlik, tüm seçilmiş kaynak değerleri, tekrar seed ve ölçü kimliklerinin korunması, yanlış gıdaya atanmış kaynakta atomik ret, dolu eski şemadan migration ve kullanıcı/katalog/günlük/favori korunması. Release build ve pending-model kontrolü başarılı; geçici kopyada boş sonraki migration scaffold edilip derlendi. Geliştirme DB'sinde migration ve iki seed sonrası mevcut dört tablonun içerik özetleri aynı kaldı. Gerçek HTTP ile 30 gıdanın 64 ölçüsü, boş listeler ve 400/404 doğrulandı. Web değişmediği için yerel web testleri tekrarlanmadı.
