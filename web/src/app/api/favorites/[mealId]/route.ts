import { favoritesMutate } from "@/lib/favorites-gateway";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ mealId: string }> };
export async function PUT(request: Request, context: Context) {
  return favoritesMutate(request, (await context.params).mealId);
}
export async function DELETE(request: Request, context: Context) {
  return favoritesMutate(request, (await context.params).mealId);
}
