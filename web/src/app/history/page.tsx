import Link from "next/link";
import DiaryHistoryView from "@/components/DiaryHistoryView";

export const dynamic = "force-dynamic";
export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ endDate?: string }> }) {
  const { endDate } = await searchParams;
  return <main className="min-h-screen bg-[#f7f8f4] px-5 py-10 text-[#18312c]">
    <div className="mx-auto max-w-4xl">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="font-semibold text-[#277f64]">Bite Routine</p><h1 className="mt-2 text-3xl font-semibold">Günlük geçmişim</h1></div>
        <nav className="flex flex-wrap gap-4 font-medium"><Link href="/">Katalog</Link><Link href="/diary">Günlüğüm</Link><Link href="/account">Hesabım</Link></nav>
      </header>
      <DiaryHistoryView key={endDate ?? "today"} initialDate={endDate} />
    </div>
  </main>;
}
