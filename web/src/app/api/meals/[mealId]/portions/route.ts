import { foodPortionsGet } from "@/lib/food-portions-gateway";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ mealId: string }> }) {
  return foodPortionsGet((await context.params).mealId);
}
