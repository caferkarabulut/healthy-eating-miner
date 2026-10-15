"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authPost } from "@/lib/auth-client";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    setBusy(true);
    setError("");
    try {
      await authPost("/api/auth/logout");
      router.replace("/login");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Çıkış yapılamadı.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={logout} disabled={busy} className="rounded-xl bg-[#173f34] px-5 py-3 font-semibold text-white disabled:opacity-50">
        {busy ? "Çıkış yapılıyor..." : "Çıkış yap"}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
