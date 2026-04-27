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

  const [{ data: clicks }, { data: adSpend }] = await Promise.all([
    supabase
      .from("click_events")
      .select("utm_campaign, is_duplicate, is_bot")
      .gte("created_at", dateFrom)
      .lte("created_at", `${dateTo}T23:59:59`),
    supabase
      .from("ad_spend_reports")
      .select("utm_campaign, campaign_name, spend, impressions, link_clicks")
      .gte("report_date", dateFrom)
      .lte("report_date", dateTo),
  ]);

  const campaignMap: Record<string, { clicks: number; non_duplicate: number; spend: number; impressions: number; meta_clicks: number }> = {};

  (clicks || []).forEach((c) => {
    const key = c.utm_campaign || "unknown";
    if (!campaignMap[key]) campaignMap[key] = { clicks: 0, non_duplicate: 0, spend: 0, impressions: 0, meta_clicks: 0 };
    campaignMap[key].clicks++;
    if (!c.is_duplicate) campaignMap[key].non_duplicate++;
  });

  (adSpend || []).forEach((r) => {
    const key = r.utm_campaign || r.campaign_name || "unknown";
    if (!campaignMap[key]) campaignMap[key] = { clicks: 0, non_duplicate: 0, spend: 0, impressions: 0, meta_clicks: 0 };
    campaignMap[key].spend += Number(r.spend);
    campaignMap[key].impressions += Number(r.impressions);
    campaignMap[key].meta_clicks += Number(r.link_clicks);
  });

  const result = Object.entries(campaignMap)
    .map(([campaign, d]) => ({
      campaign,
      ...d,
      cpc: d.clicks > 0 ? Math.round((d.spend / d.clicks) * 100) / 100 : 0,
    }))
    .sort((a, b) => b.clicks - a.clicks);

  return apiSuccess(result);
}
