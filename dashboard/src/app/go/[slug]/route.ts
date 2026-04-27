import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  hashIp,
  isBot,
  detectDevice,
  detectBrowser,
  detectOS,
  getClientIp,
} from "@/lib/utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const url = new URL(request.url);
  const supabase = await createServiceClient();

  const { data: product } = await supabase
    .from("affiliate_products")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!product) {
    return NextResponse.redirect(new URL("/", url.origin), 302);
  }

  const userAgent = request.headers.get("user-agent");
  const ipHash = hashIp(getClientIp(request));
  const utmSource = url.searchParams.get("utm_source");
  const utmMedium = url.searchParams.get("utm_medium");
  const utmCampaign = url.searchParams.get("utm_campaign");
  const utmContent = url.searchParams.get("utm_content");
  const utmTerm = url.searchParams.get("utm_term");
  const landingPageSlug = url.searchParams.get("lp");

  const isBotClick = isBot(userAgent);

  let isDuplicate = false;
  if (!isBotClick) {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("click_events")
      .select("*", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .eq("product_slug", slug)
      .eq("user_agent", userAgent || "")
      .gte("created_at", tenMinutesAgo);
    isDuplicate = (count || 0) > 0;
  }

  let landingPageId: string | null = null;
  if (landingPageSlug) {
    const { data: lp } = await supabase
      .from("landing_pages")
      .select("id")
      .eq("slug", landingPageSlug)
      .single();
    if (lp) landingPageId = lp.id;
  }

  try {
    await supabase.from("click_events").insert({
      product_id: product.id,
      landing_page_id: landingPageId,
      product_slug: product.slug,
      landing_page_slug: landingPageSlug,
      redirect_slug: slug,
      destination_url: product.destination_url,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_content: utmContent,
      utm_term: utmTerm,
      referrer: request.headers.get("referer"),
      user_agent: userAgent,
      ip_hash: ipHash,
      device_type: detectDevice(userAgent),
      browser: detectBrowser(userAgent),
      os: detectOS(userAgent),
      is_duplicate: isDuplicate,
      is_bot: isBotClick,
    });
  } catch (error) {
    console.error("Click logging failed", error);
  }

  return NextResponse.redirect(product.destination_url, 302);
}
