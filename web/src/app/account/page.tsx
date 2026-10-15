import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LogoutButton from "./logout-button";
import { apiUrl, IDENTITY_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const cookie = (await cookies()).get(IDENTITY_COOKIE);
  if (!cookie) redirect("/login");

  let response: Response;
  try {
    response = await fetch(apiUrl("/me"), {
      headers: { Cookie: `${IDENTITY_COOKIE}=${cookie.value}` },
      cache: "no-store",
    });
  } catch {
    return <main className="mx-auto max-w-xl p-8">Hesap bilgilerine şu anda ulaşılamıyor.</main>;
  }
  if (response.status === 401) redirect("/login");
  if (!response.ok) return <main className="mx-auto max-w-xl p-8">Hesap bilgileri alınamadı.</main>;
  const profile = (await response.json()) as { email: string | null };

  return (
    <main className="min-h-screen bg-[#f7f8f4] px-5 py-12 text-[#18312c]">
      <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#277f64]">Bite Routine</p>
        <h1 className="mt-3 text-3xl font-semibold">Hesabım</h1>
        <p className="mt-3 text-[#5b7166]">Oturumunuz doğrulandı. <Link href="/diary" className="font-semibold underline">Yemek günlüğünü aç</Link>.</p>
        <dl className="mt-8 rounded-xl bg-[#f2f7f1] p-5">
          <dt className="text-sm text-[#5b7166]">E-posta</dt>
          <dd className="mt-1 font-medium">{profile.email ?? "E-posta bilgisi yok"}</dd>
        </dl>
        <div className="mt-8 flex items-center gap-5">
          <LogoutButton />
          <Link href="/" className="font-medium text-[#277f64] hover:underline">Yemek kataloğuna dön</Link>
        </div>
      </div>
    </main>
  );
}
