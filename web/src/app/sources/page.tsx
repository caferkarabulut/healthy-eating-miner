import Link from "next/link";
export default function SourcesPage() {
  return <main className="min-h-screen bg-[#f7f8f4] px-5 py-10 text-[#18312c]">
    <div className="mx-auto max-w-2xl">
      <Link href="/" className="font-semibold text-[#277f64] underline">Kataloğa dön</Link>
      <h1 className="mt-6 text-3xl font-semibold">Veri kaynakları</h1>
      <section className="mt-6 space-y-4 rounded-2xl border border-[#d9e4dc] bg-white p-6 leading-7">
        <h2 className="text-xl font-semibold">USDA FoodData Central</h2>
        <p>Katalogdaki başlangıç gıdaları U.S. Department of Agriculture, Agricultural Research Service, FoodData Central kaynaklıdır. Gıdaya özel kaynak bağlantısını, katalogda gıdayı seçerek açabilirsiniz.</p>
        <p>Besin değerleri yaklaşık değerlerdir ve gıdanın 100 g yenilebilir kısmı içindir. Süt dahil miktarlar gramla kullanılır; 100 ml, adet veya ev ölçüsü değildir. Hazırlama biçimi, ürün ve pişirme koşulları değerleri değiştirebilir.</p>
        <p>Çiğ, pişmiş ve kuru gibi hazırlama bilgilerine dikkat edin. Eksik besin bilgisi sıfır kabul edilmez; “Veri yok” olarak gösterilir. Günlüğe eklenen besin bilgileri kayıt anındaki değerleri korur.</p>
        <p>USDA verileri kamu malıdır ve CC0 kapsamında sunulur. <a href="https://fdc.nal.usda.gov/api-guide/" className="font-semibold text-[#246b53] underline">Kaynak ve lisans bilgisi</a></p>
        <p><a href="https://fdc.nal.usda.gov/" className="font-semibold text-[#246b53] underline">FoodData Central</a> · <a href="https://fdc.nal.usda.gov/Foundation_Foods_Documentation/" className="font-semibold text-[#246b53] underline">Besin verilerinin yöntemi</a></p>
      </section>
    </div>
  </main>;
}
