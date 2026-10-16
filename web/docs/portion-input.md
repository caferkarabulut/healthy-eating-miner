# Kaynaklı miktar girişi

Katalog ve favoriler aynı FoodAmountInput/CatalogAmount akışını kullanır. Her gıdada gram vardır; aynı kökenli, çerez iletmeyen `GET /api/meals/{mealId}/portions` kaynak ölçülerini getirir. Yüklenirken, liste boşken veya erişim hatasında gram çalışır. USDA cup etiketi Türk su bardağı değildir; küçük/orta/büyük seçenekler ayrı kalır. Oturumsuz kullanıcı önizlemeyi kullanabilir, kayıt için giriş bağlantısı gösterilir.

Türkçe virgül ve nokta desteklenir (1,5 adet). Gram en fazla iki ondalıktır. Ölçü önizlemesi kaynak quantity × gramWeight / amount oranını iki ondalık gram olarak yaklaşık gösterir; kayıt isteğinde yalnız portionId + quantity gönderilir. Gram ve ölçü alanları birlikte gönderilmez. Son dönüşüm ve sınır kararı API'dedir; tarayıcı sayıları yaklaşık önizlemedir. Kcal/makro eksikleri sayı/sıfır yapılmaz.

Günlük satırı kayıtlı miktar/ölçü adını ve yaklaşık gramı gösterir; eski/gram kaydı yalnız gram gösterir. Düzenleme mevcut ölçü adı, miktarı ve oranını kopyadan açar; canlı kaynak değişmiş/silinmiş veya yüklenememiş olsa bile yalnız tarih/öğün düzenlemesinde miktar alanları gönderilmez. Açık miktar/ölçü değişiminde canlı ölçü kullanılır; ölçü yüklenemiyorsa gram seçilebilir. Düzenleme önizlemesi güncel katalog besinlerinden değil, günlükteki besin kopyasından ölçeklenir. Başarı aynı özel günlük liste/özet yenilemesini kullanır.

HttpOnly oturum ve iki CSRF katmanı korunur. Günlük mutasyonları tek denemedir; belirsiz yanıt otomatik tekrarlanmaz. Gönderim sırasında miktar ve diğer kontroller kilitlenir. Kişisel günlük yanıtları private/no-store kalır; ölçü geçidi de no-store'dur ve kişisel durum taşımaz.

Doğrulama: 60 web testi, build/lint; gerçek tarayıcıda Türkçe gram, 1,5 orta adet, favoriden 0,5 küçük adet, ölçüsüz yoğurdu gramla kaydetme, kayıtlı ölçüyle açılan düzenleme, yalnız öğün/tarih değişimi, miktar değişimi ve gram moda dönüşün yenileme sonrası kalıcılığı. 375 px katalog dialogu ve günlük düzenlemesinde yatay taşma yoktur. [API ve yuvarlama](../../backend-dotnet/docs/diary-contract.md).
