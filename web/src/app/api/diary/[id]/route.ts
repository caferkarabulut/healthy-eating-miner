import { diaryMutate } from "@/lib/diary-gateway";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  return diaryMutate(request, (await context.params).id);
}
export async function DELETE(request: Request, context: Context) {
  return diaryMutate(request, (await context.params).id);
}
