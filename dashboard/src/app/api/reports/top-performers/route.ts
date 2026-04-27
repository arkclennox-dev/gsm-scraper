import { authenticateRequest } from "@/lib/api/auth";
import { apiSuccess, unauthorized } from "@/lib/api/response";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { authenticated } = await authenticateRequest(request, "reports:read");
  if (!authenticated) return unauthorized();

  const url = new URL(request.url);
  const dateFrom = url.searchParams.get("from") || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const dateTo = url.searchParams.get("to") || new Date().toISOString().split("T")[0];
  const limit = parseInt(url.searchParams.get("limit") || "5", 10);

  const supabase = await createServiceClient();

  const [{ data: clicks }, { data: adSpend }] = await Promise.all([
    supabase
      .from("click_events")
      .select("product_slug, utm_campaign, is_duplicate")
      .gte("created_at", dateFrom)
      .lte("created_at", `${dateTo}T23:59:59`),
    supabase
      .from("ad_spend_reports")
      .select("utm_campaign, campaign_name, spend")
      .gte("report_date", dateFrom)
      .lte("report_date", dateTo),
  ]);

  const productMap: Record<string, number> = {};
  const campaignSpend: Record<string, { clicks: number; spend: number }> = {};

  (clicks || []).forEach((c) => {
    if (c.product_slug) productMap[c.product_slug] = (productMap[c.product_slug] || 0) + 1;
    const campaign = c.utm_campaign || "unknown";
    if (!campaignSpend[campaign]) campaignSpend[campaign] = { clicks: 0, spend: 0 };
    campaignSpend[campaign].clicks++;
  });

  (adSpend || []).forEach((r) => {
    const campaign = r.utm_campaign || r.campaign_name || "unknown";
    if (!campaignSpend[campaign]) campaignSpend[campaign] = { clicks: 0, spend: 0 };
    campaignSpend[campaign].spend += Number(r.spend);
  });

  const topProducts = Object.entries(productMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([product, clicks]) => ({ product, clicks }));

  const topCampaigns = Object.entries(campaignSpend)
    .sort(([, a], [, b]) => b.clicks - a.clicks)
    .slice(0, limit)
    .map(([campaign, d]) => ({
      campaign,
      clicks: d.clicks,
      spend: d.spend,
      cpc: d.clicks > 0 ? Math.round((d.spend / d.clicks) * 100) / 100 : 0,
    }));

  const bestCpc = Object.entries(campaignSpend)
    .filter(([, d]) => d.clicks >= 5 && d.spend > 0)
    .sort(([, a], [, b]) => (a.spend / a.clicks) - (b.spend / b.clicks))
    .slice(0, limit)
    .map(([campaign, d]) => ({
      campaign,
      clicks: d.clicks,
      spend: d.spend,
      cpc: Math.round((d.spend / d.clicks) * 100) / 100,
    }));

  return apiSuccess({ top_products: topProducts, top_campaigns: topCampaigns, best_cpc: bestCpc });
}
