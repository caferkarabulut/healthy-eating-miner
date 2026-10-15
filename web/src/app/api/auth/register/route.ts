import { registerPost } from "@/lib/register-gateway";
export function POST(request: Request) { return registerPost(request); }
