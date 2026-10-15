# Kullanıcıya özel favori gıdalar

`favorite_meals`, Identity kullanıcı kimliği ve katalog gıda kimliğinden oluşur. `(user_id, meal_id)` bileşik birincil anahtarı aynı çifti veritabanında benzersiz tutar. Her iki sütun yabancı anahtardır; kullanıcı veya katalog gıdası silinirse favori ilişkisi silinir. Günlük gıda FK'sının mevcut silme kısıtı değişmez. `AddFavoriteMeals` yalnız yeni tablo/indeks ekler, mevcut kullanıcı/katalog/günlük satırlarını değiştirmez. Geliştirmede migration öncesi `bite_routine` hedefini doğrulayın; `bite_routine_test` yalnız izole testler içindir.

Tüm uç noktalar Identity oturumu gerektirir. Kullanıcı kimliği yalnız oturumdan gelir. PUT/DELETE gövde kullanmaz; gövdedeki `userId` başka kullanıcıya erişim sağlamaz. Çerezli PUT/DELETE API antiforgery kontrolünden geçer; çerezsiz mobil bearer desteklenir.

| Yöntem / yol | Davranış |
|---|---|
| GET `/me/favorite-meals?page=1&pageSize=20` | `MealListResponse`: items, page, pageSize, totalCount. Yalnız kullanıcıya ait favoriler, katalogdaki `mealId` artan sırası. Katalogdaki aynı page/pageSize aralıkları, taşma güvenliği ve isteğe bağlı Türkçe `search` uygulanır. Boş/sayfa dışı liste 200 ve boş items döner. |
| PUT `/me/favorite-meals/{mealId}` | Var olan katalog gıdasını favoriye ekler. İlk/tekrar/eşzamanlı tekrar isteği 204; bulunmayan gıda 404. `INSERT ... ON CONFLICT DO NOTHING` bileşik anahtarla atomik çalışır. |
| DELETE `/me/favorite-meals/{mealId}` | Yalnız çağıranın ilişkisini kaldırır. Zaten çıkarılmış, başka kullanıcıda olan veya bulunmayan gıdanın çıkarılması da 204; başka kullanıcının ilişkisi değişmez. |

Oturumsuz istek 401, geçersiz pozitif Int32 kimlik veya sayfa 400, çerezli değişiklikte eksik/geçersiz API antiforgery 403 döner. Başarılı PUT/DELETE gövdesizdir. Favori yanıtları saklanmaz (`no-store`).

Favoriler gıda adı veya besin kopyası tutmaz. GET her zaman güncel katalog adı, nullable 100 g besin değerleri ve kaynak bilgisini döndürür. Favoriye ekleme/çıkarma veya katalog güncellemesi günlük kayıtlarındaki ad/besin/kaynak kopyalarını değiştirmez.

## Web ve ağ sınırı

Tarayıcı aynı kökenli GET `/api/favorites` ve PUT/DELETE `/api/favorites/{mealId}` geçidini kullanır. Geçit yalnız Identity çerezini iletir; değişikliklerde mevcut Origin/CSRF kontrolünü ve sunucudan sunucuya API antiforgery çiftini uygular. Kişisel yanıtlar (hatalar dahil) `Cache-Control: private, no-store` / `Vary: Cookie`; tüm fetch işlemleri `no-store` kullanır. Katalog sunucu çıktısına kişisel favori durumu eklenmez, tarayıcıda özel geçitten okunur. Token veya e-posta localStorage'a eklenmez.

Katalog kartlarındaki açık etiketli düğmeler favoriye ekler/çıkarır; oturumsuz kullanıcı giriş bağlantısı görür. `/favorites` tüm favorileri API'nin en fazla 100 öğelik sayfalarından toplar ve mevcut gramaj/tarih/öğün seçimiyle `DiaryAddForm` üzerinden günlüğe ekler. Bekleme, boş liste, oturum bitişi ve hata durumları vardır. Günlüğe kayıt sürerken favori değişikliği; favori değişirken günlük gönderimi engellenir. Başarıdan sonra özel liste tekrar okunur. Belirsiz değişiklik otomatik tekrarlanmaz; hata sonrası “Favorileri yenile” ile sonuç kontrol edilir. Pencereye dönüşte durum yeniden okunur; günlük gönderimi sırasında otomatik yenileme yapılmaz.

Doğrulama: gerçek PostgreSQL'de kullanıcı ayrımı, sekiz eşzamanlı PUT, tekrarlanan DELETE, bileşik anahtarda doğrudan mükerrer kayıt reddi, sayfalama, canlı katalog/günlük kopyası ayrımı; API/web CSRF ve bearer HTTP kontrolleri. Yeni migration'dan sonra geçici kopyada boş sonraki migration ve derleme doğrulanır.
