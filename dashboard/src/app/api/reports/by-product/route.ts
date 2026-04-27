import { authenticateRequest } from "@/lib/api/auth";
import { apiSuccess, unauthorized } from "@/lib/api/response";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { authenticated } = await authenticateRequest(request, "reports:read");
  if (!authenticated) return unauthorized();

  const url = new URL(request.url);
  const dateFrom = url.searchParams.get("from") || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const dateTo = url.searchParams.get("to") || new Date().toISOString().split("T")[0];

  const supabase = await createServiceClient();

  const { data: clicks } = await supabase
    .from("click_events")
    .select("product_slug, is_duplicate, is_bot")
    .gte("created_at", dateFrom)
    .lte("created_at", `${dateTo}T23:59:59`);

  const productMap: Record<string, { clicks: number; non_duplicate: number; bot: number }> = {};

  (clicks || []).forEach((c) => {
    const key = c.product_slug || "unknown";
    if (!productMap[key]) productMap[key] = { clicks: 0, non_duplicate: 0, bot: 0 };
    productMap[key].clicks++;
    if (!c.is_duplicate) productMap[key].non_duplicate++;
    if (c.is_bot) productMap[key].bot++;
  });

  const result = Object.entries(productMap)
    .map(([product, d]) => ({ product, ...d }))
    .sort((a, b) => b.clicks - a.clicks);

  return apiSuccess(result);
}
