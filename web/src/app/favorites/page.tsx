import Link from "next/link";
import FavoriteCatalog from "@/components/FavoriteCatalog";

export const dynamic = "force-dynamic";
export default function FavoritesPage() {
  return <main className="min-h-screen bg-[#f7f8f4] px-5 py-10 text-[#18312c]">
    <div className="mx-auto max-w-6xl">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Favori gıdalarım</h1>
        <nav className="flex flex-wrap gap-4 font-medium"><Link href="/">Katalog</Link><Link href="/diary">Günlüğüm</Link><Link href="/account">Hesabım</Link></nav>
      </header>
      <FavoriteCatalog />
    </div>
  </main>;
}
