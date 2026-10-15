import { favoritesGet } from "@/lib/favorites-gateway";

export const dynamic = "force-dynamic";
export function GET(request: Request) { return favoritesGet(request); }
