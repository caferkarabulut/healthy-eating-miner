import { diaryHistoryGet } from "@/lib/diary-history-gateway";
export const dynamic = "force-dynamic";
export function GET(request: Request) { return diaryHistoryGet(request); }
