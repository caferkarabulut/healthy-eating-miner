# Mobil günlük

## Kapsam ve sözleşme

`feat/mobile-diary`, PR #25’in doğrulanan `4c7ff5d` HEAD’i başarılı CI ve son inceleme sonrası aynı HEAD koşuluyla birleştirildikten sonra güncel main’den açıldı. Önceki Samsung/iPhone kabulü **kullanıcı doğrulamasıdır**; kullanıcı iPhone’daki geçici CA profilini de kaldırdığını bildirdi.

Mevcut [günlük API sözleşmesi](../../backend-dotnet/docs/diary-contract.md) ve [kaynaklı ölçüler](../../backend-dotnet/docs/food-portions-contract.md) kullanılır. Backend/model/migration ve web değişmedi. Düzenleme/silme, favoriler, geçmiş ve onboarding bu mobil dilimde yoktur.

- Herkese açık katalog detayında gram veya aynı gıdanın `/meals/{id}/portions` ölçüsü seçilir; doğrulanmış ölçü yoksa/yüklenemezse gram çalışır. Küçük/orta/büyük korunur; USDA cup Türk su bardağı değildir.
- Gramda Türkçe virgül/nokta, 0,01–10000 sınırı ve iki ondalık; ölçüde pozitif kesirli miktar kabul edilir. Gövde yalnız `grams` veya `portionId` + `quantity` içerir. Nihai gram/dönüşüm/besin hesabını sunucu yapar; istemci dönüşmüş gram göndermez.
- `GET/POST /me/diary-entries` mevcut opak bearer ile doğrudan çağrılır; çerez gönderilmez. Yanıtlar `no-store`, kişisel veri yalnız ekran belleğindedir. Yeni token depolama veya web CSRF değişikliği yoktur.
- Gün başlangıçta Europe/Istanbul takviminden gelir; varsayılan bugün ön plana gelince ve 30 saniyede bir güncellenir. Kullanıcı gün seçince korunur; Bugün varsayılan davranışı geri açar. Takvim tarihi UTC’ye çevrilmez.
- `/diary` günün kayıtlarını Kahvaltı → Öğle → Akşam → Ara öğün → Diğer sırasında gruplar; grup içi API sırası korunur. `summary` ve `mealSummaries` sunucudan gösterilir, mobilde yeniden toplanmaz. Eksik kayıt değeri “Veri yok”, eksik toplam “Eksik veri”; gerçek sıfır 0 kalır. Oluşturulma zamanı tüketim saati gibi gösterilmez.

## İstek güvenliği

Oturum nesli/kullanıcı değişince kişisel ekran ve form yeniden kurulur, önceki veri gösterilmez. Tarih/yenileme değişince eski yanıt uygulanmaz. Katalog oturumsuz kalır; günlük ve ekleme giriş gerektirir. Başarılı ekleme seçilen günün günlüğünü açar; ekran odağı ve manuel yenileme no-store GET yapar.

Mevcut tek eşzamanlı refresh yeniden kullanılır. Yalnız alınmış 401 cevabı yetkilendirme reddi olduğundan bir kez refresh sonrası yeniden denenebilir; ağ/5xx/zaman aşımı veya okunamayan POST yanıtı otomatik tekrarlanmaz. Yanıt gövdesinde de zaman aşımı vardır. Çift dokunma senkron ref kilidiyle engellenir. Belirsiz sonuçta gönderim kapanır; seçilen günün günlüğünü kontrol etme bağlantısı sunulur. Kullanıcı kontrol sonrası açıkça yeni kayıt hazırlayabilir. Çıkıştan sonra geciken istek sonucu uygulanmaz.

## Doğrulama — 22 Ekim 2026

- Mobil davranış testleri: Türkçe miktar, İstanbul gün/ay/yıl sınırı, null/sıfır, sunucu toplamları, gram/adet gövdeleri, yinelenen dokunma, 401 refresh, geçersiz yenileme, belirsiz/stall POST, ölçü hatasında gram, eski tarih/hesap yanıtlarının engellenmesi. TypeScript, lint, SDK uyumu ve Android/iOS Metro paketlemesi çalıştırılır; CI aynı kontrolleri keşfeder.
- Gerçek localhost API: iki sentetik hesapla 150,25 g ve 1,5 orta adet = 66 g; günlük/öğün toplamları, yeniden oluşturulan oturum istemcisinde kalıcılık, boş gün, kullanıcı ayrımı ve geçersiz gram doğrulandı. HTTP bellek deposu testi native ekran/SecureStore yerine sayılmadı.
- **iPhone Duo / iOS 27.1 Simulator / Expo Go:** gerçek API ile ayrı iki test hesabı; gram ve kesirli adetle ekleme, Kahvaltı/Öğle grupları ve 309,2 kcal toplamı, tarih seçimi/Ara öğün, boş gün, tam kapatıp açınca oturum/kayıtların korunması, iki hesap ayrımı görüldü. Görüntü ve erişilebilirlik ağacından native kontrol yapıldı; web önizlemesi kullanılmadı.
- Bağlantı hatası için yalnız Simulator’a ait loopback geçidi günlük soketini kesti; hata/manuel toparlanma ve belirsiz POST sonrası devre dışı buton/doğru gün kontrol bağlantısı görüldü. Bu fiziksel Wi-Fi testi değildir. Koordinatla kaydırma aracı `noWindowsAvailable` verdi; alan/öğün/gönderim erişilebilirlik eylemleriyle test edildi. Fiziksel cihaz sonucu aşağıdaki kullanıcı bildiriminden ayrı tutulur.
- Bütün sentetik hesaplar ve bağlı günlük kayıtları yalnız hedefi doğrulanmış localhost PostgreSQL 17 `bite_routine` içinde temizlendi. Mevcut kullanıcı/katalog verileri korunur. Test DB’si geliştirme için kullanılmadı. Geçici Simulator proxy/Metro kapatıldı; mevcut API/Android Metro korunur.

## Fiziksel cihaz kullanıcı bildirimi

22 Ekim 2026: Samsung Galaxy A72 / Android 14 / One UI 6.1 için kullanıcı USB bağlantısının çalıştığını bildirdi. Ardından iPhone 13 / iOS 26.6.1’de yeni geçici CA’yı yükleyip Bite Routine’i açtığını ve kontrolleri/testleri yaptığını bildirdi. iPhone günlük kabulü **kullanıcı doğrulaması** olarak kaydedildi; agent tarafından gözlemlenen Simulator/HTTP testleriyle karıştırılmaz. Samsung için bu son bildirim bağlantı onayıdır; tek tek günlük kabul maddeleri ayrıca bildirilmedi.

iPhone testi için belgelenen geçici HTTPS/Metro bağlantısı yeniden açıldı; API localhost, DB erişimi yerel kaldı. Kullanıcı uygulamayı denemeye devam edebilsin diye bağlantı şu an açık; test sonu temizlik yöntemi aşağıdadır. Kaynak kodda IP/sertifika veya anahtar tutulmaz.

## iPhone ve Samsung kısa kabul listesi

Her cihazda ayrı ayrı uygulayın; sonuçları model/OS ile kullanıcı doğrulaması olarak kaydedin:

1. Oturumsuz katalog açık, Günlüğüm giriş istiyor. Giriş yapın; katalogdan Yumurta (çiğ) seçin.
2. 150,25 g, bir gün ve Öğle seçip ekleyin; tek kayıt, doğru gün ve öğün toplamını görün. Gönderimde iki kez dokunmak ikinci kayıt oluşturmamalı.
3. Aynı gün 1,5 Orta adet/Kahvaltı ekleyin; yaklaşık 66 g ve iki öğün görünmeli. Katalogdaki 143 kcal/100 g ile toplam yaklaşık 309,2 kcal olur.
4. Ölçüsüz yoğurtta gram çalışmalı. Boş güne gidip geri dönün; kayıtları ve toplamları kontrol edin. Yazılım klavyesi açıkken formu kaydırın, butonlara erişin.
5. Tam kapatıp açın; günlük kayıtları kalsın. Çıkış yapıp ikinci hesapla aynı güne bakın; ilk hesabın kayıtları görünmesin.
6. Uygulama yüklüyken bağlantıyı kesin; anlaşılır hata/manuel tekrar deneme olmalı, oturum korunmalı. Ekleme sonucu belirsizse tekrar göndermeden seçilen günü kontrol edin.

Bağlantı için önce [mevcut belgeli cihaz yöntemi](device-validation.md) kullanılır. Samsung USB’de yalnız 5080/8081 reverse; bitince yalnız bu iki reverse kaldırılır. iPhone’un önceki geçidi ve CA’sı temizlendi: tekrar fiziksel test için aynı özel Wi-Fi üzerinde geçici HTTPS API ve Metro geçidi yeniden hazırlanmalı, kullanıcı yalnız geçici CA’ya güven vermelidir. Test sonunda yalnız o geçitler kapatılır, anahtarlar silinir ve geçici CA profili kullanıcı tarafından kaldırılır. DB ağa açılmaz; kalıcı IP veya gizli değer repoya yazılmaz. İlk teslimde fiziksel erişim açılmadı; sonraki kullanıcı testi için yukarıdaki geçici iPhone bağlantısı yeniden hazırlandı.
