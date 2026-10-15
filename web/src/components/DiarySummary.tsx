import type { DiarySummary as Summary } from "@/lib/diary";
import { summaryMetrics } from "@/lib/diary-summary";

export default function DiarySummary({ summary }: { summary: Summary }) {
  const metrics = summaryMetrics(summary);
  return (
    <section aria-label="Günlük toplamlar" className="mt-4 rounded-xl border border-[#d9e4dc] bg-[#edf4eb] p-4">
      <h2 className="text-base font-semibold">Günlük toplamlar</h2>
      <p className="mt-1 text-sm text-[#5b7166]">{summary.entryCount} kayıt · Yaklaşık besin değerleri</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        {metrics.map((metric) => <div key={metric.label}><dt>{metric.label}</dt><dd className="mt-1 font-semibold">{metric.text}</dd></div>)}
      </dl>
      {metrics.some((metric) => metric.text === "Eksik veri") && (
        <p className="mt-3 text-xs text-[#5b7166]">En az bir kayıtta bu besin değeri bulunmadığı için ilgili toplam hesaplanamıyor. Diğer toplamlar gösterilir.</p>
      )}
    </section>
  );
}
