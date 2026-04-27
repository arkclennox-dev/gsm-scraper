import { authenticateRequest } from "@/lib/api/auth";
import { apiSuccess, unauthorized, serverError } from "@/lib/api/response";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { authenticated } = await authenticateRequest(request, "reports:read");
  if (!authenticated) return unauthorized();

  const url = new URL(request.url);
  const dateFrom = url.searchParams.get("from") || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const dateTo = url.searchParams.get("to") || new Date().toISOString().split("T")[0];

  const supabase = await createServiceClient();

  const [{ data: clicks }, { data: adSpend }] = await Promise.all([
    supabase
      .from("click_events")
      .select("created_at, is_duplicate, is_bot")
      .gte("created_at", dateFrom)
      .lte("created_at", `${dateTo}T23:59:59`),
    supabase
      .from("ad_spend_reports")
      .select("report_date, spend, impressions, link_clicks")
      .gte("report_date", dateFrom)
      .lte("report_date", dateTo),
  ]);

  const dayMap: Record<string, { clicks: number; non_duplicate: number; spend: number; impressions: number; meta_clicks: number }> = {};

  (clicks || []).forEach((c) => {
    const day = c.created_at.split("T")[0];
    if (!dayMap[day]) dayMap[day] = { clicks: 0, non_duplicate: 0, spend: 0, impressions: 0, meta_clicks: 0 };
    dayMap[day].clicks++;
    if (!c.is_duplicate) dayMap[day].non_duplicate++;
  });

  (adSpend || []).forEach((r) => {
    if (!dayMap[r.report_date]) dayMap[r.report_date] = { clicks: 0, non_duplicate: 0, spend: 0, impressions: 0, meta_clicks: 0 };
    dayMap[r.report_date].spend += Number(r.spend);
    dayMap[r.report_date].impressions += Number(r.impressions);
    dayMap[r.report_date].meta_clicks += Number(r.link_clicks);
  });

  const result = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({
      date,
      ...d,
      cpc: d.clicks > 0 ? Math.round((d.spend / d.clicks) * 100) / 100 : 0,
    }));

  return apiSuccess(result);
}
