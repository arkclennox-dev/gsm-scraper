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
      .select("is_duplicate, is_bot")
      .gte("created_at", dateFrom)
      .lte("created_at", `${dateTo}T23:59:59`),
    supabase
      .from("ad_spend_reports")
      .select("spend, impressions, link_clicks, landing_page_views")
      .gte("report_date", dateFrom)
      .lte("report_date", dateTo),
  ]);

  const allClicks = clicks || [];
  const allSpend = adSpend || [];

  const redirectClicks = allClicks.length;
  const nonDuplicateClicks = allClicks.filter((c) => !c.is_duplicate).length;
  const botClicks = allClicks.filter((c) => c.is_bot).length;
  const duplicateClicks = allClicks.filter((c) => c.is_duplicate).length;
  const spend = allSpend.reduce((s, r) => s + Number(r.spend), 0);
  const impressions = allSpend.reduce((s, r) => s + Number(r.impressions), 0);
  const metaLinkClicks = allSpend.reduce((s, r) => s + Number(r.link_clicks), 0);
  const metaLandingPageViews = allSpend.reduce((s, r) => s + Number(r.landing_page_views), 0);

  return apiSuccess({
    redirect_clicks: redirectClicks,
    non_duplicate_clicks: nonDuplicateClicks,
    bot_clicks: botClicks,
    duplicate_clicks: duplicateClicks,
    spend,
    impressions,
    meta_link_clicks: metaLinkClicks,
    meta_landing_page_views: metaLandingPageViews,
    cost_per_redirect_click: redirectClicks > 0 ? Math.round((spend / redirectClicks) * 100) / 100 : 0,
    cost_per_non_duplicate_click: nonDuplicateClicks > 0 ? Math.round((spend / nonDuplicateClicks) * 100) / 100 : 0,
    meta_cpc: metaLinkClicks > 0 ? Math.round((spend / metaLinkClicks) * 100) / 100 : 0,
    click_gap: metaLinkClicks - redirectClicks,
    duplicate_rate: redirectClicks > 0 ? Math.round((duplicateClicks / redirectClicks) * 10000) / 10000 : 0,
    bot_rate: redirectClicks > 0 ? Math.round((botClicks / redirectClicks) * 10000) / 10000 : 0,
  });
}
