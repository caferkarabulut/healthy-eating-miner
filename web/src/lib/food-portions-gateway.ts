import { apiUrl } from "./session.ts";
const headers = { "Cache-Control": "no-store" };
export async function foodPortionsGet(mealId: string, fetcher: typeof fetch = fetch): Promise<Response> {
  if (!/^[1-9]\d*$/.test(mealId) || Number(mealId) > 2147483647) return Response.json({ error: "Geçersiz gıda." }, { status: 400, headers });
  try {
    const response = await fetcher(apiUrl(`/meals/${mealId}/portions`), { cache: "no-store", redirect: "manual" });
    if (!response.ok) return Response.json({ error: "Ölçüler alınamadı." }, { status: response.status === 404 ? 404 : 502, headers });
    return Response.json(await response.json(), { headers });
  } catch { return Response.json({ error: "Ölçüler alınamadı." }, { status: 502, headers }); }
}
