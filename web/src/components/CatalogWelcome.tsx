"use client";
import { useEffect, useState } from "react";
export default function CatalogWelcome() {
  const [authenticated, setAuthenticated] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin", signal: controller.signal })
      .then((response) => { if (!controller.signal.aborted) setAuthenticated(response.ok); }).catch(() => {});
    return () => controller.abort();
  }, []);
  return <div>
    <h2 className="text-xl font-semibold sm:text-2xl">{authenticated ? "Hoş geldiniz." : "Bugün ne yediniz?"}</h2>
    <p className="mt-2 text-sm text-[#5b7166]">Gıdanı seç, miktarını gir ve günlüğüne ekle.</p>
  </div>;
}
