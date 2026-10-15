import { diaryGet, diaryPost } from "@/lib/diary-gateway";

export const dynamic = "force-dynamic";
export function GET(request: Request) { return diaryGet(request); }
export function POST(request: Request) { return diaryPost(request); }
