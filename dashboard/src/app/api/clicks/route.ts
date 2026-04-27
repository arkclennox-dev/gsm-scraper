import { authenticateRequest } from "@/lib/api/auth";
import { getPaginationParams } from "@/lib/api/pagination";
import { apiSuccessWithMeta, unauthorized, serverError } from "@/lib/api/response";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { authenticated } = await authenticateRequest(request, "clicks:read");
  if (!authenticated) return unauthorized();

  const url = new URL(request.url);
  const { page, pageSize, from, to } = getPaginationParams(url);

  const supabase = await createServiceClient();
  let query = supabase
    .from("click_events")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  const dateFrom = url.searchParams.get("from");
  const dateTo = url.searchParams.get("to");
  const productId = url.searchParams.get("product_id");
  const utmSource = url.searchParams.get("utm_source");
  const utmCampaign = url.searchParams.get("utm_campaign");
  const utmContent = url.searchParams.get("utm_content");
  const includeBots = url.searchParams.get("include_bots");
  const includeDuplicates = url.searchParams.get("include_duplicates");

  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59`);
  if (productId) query = query.eq("product_id", productId);
  if (utmSource) query = query.eq("utm_source", utmSource);
  if (utmCampaign) query = query.ilike("utm_campaign", `%${utmCampaign}%`);
  if (utmContent) query = query.ilike("utm_content", `%${utmContent}%`);
  if (includeBots === "false") query = query.eq("is_bot", false);
  if (includeDuplicates === "false") query = query.eq("is_duplicate", false);

  const { data, count, error } = await query;
  if (error) return serverError(error.message);

  return apiSuccessWithMeta(data || [], { page, pageSize, total: count || 0 });
}
