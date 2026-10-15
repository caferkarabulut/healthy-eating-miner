import Link from "next/link";
import DiaryView from "@/components/DiaryView";
import { isDiaryDate } from "@/lib/diary";

export const dynamic = "force-dynamic";
export default async function DiaryPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams;
  return (
    <main className="min-h-screen bg-[#f7f8f4] px-5 py-10 text-[#18312c]">
      <div className="mx-auto max-w-4xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="font-semibold text-[#277f64]">Bite Routine</p><h1 className="mt-2 text-3xl font-semibold">Yemek günlüğüm</h1></div>
          <nav className="flex gap-4 font-medium"><Link href="/">Katalog</Link><Link href="/account">Hesabım</Link></nav>
        </header>
        <DiaryView key={isDiaryDate(date) ? date : "today"} initialDate={isDiaryDate(date) ? date : undefined} />
      </div>
    </main>
  );
}
