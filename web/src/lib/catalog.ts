export const CATALOG_PAGE_SIZE = 20;

export function catalogQuery(params: { q?: string; page?: string }) {
  const search = typeof params.q === "string" ? params.q.trim() : "";
  const parsed = typeof params.page === "string" && /^[1-9]\d*$/.test(params.page) ? Number(params.page) : 1;
  const page = Number.isSafeInteger(parsed) && parsed <= 2147483647 ? parsed : 1;
  return { search, page };
}

export function catalogHref(search: string, page: number) {
  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export function catalogPages(search: string, page: number, totalCount: number) {
  const lastPage = Math.max(1, Math.ceil(totalCount / CATALOG_PAGE_SIZE));
  return {
    lastPage,
    previous: page > 1 ? catalogHref(search, Math.min(page - 1, lastPage)) : null,
    next: page < lastPage ? catalogHref(search, page + 1) : null,
  };
}
