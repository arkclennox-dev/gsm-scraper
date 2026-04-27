import { authenticateRequest } from "@/lib/api/auth";
import { getPaginationParams } from "@/lib/api/pagination";
import { apiSuccessWithMeta, apiSuccess, unauthorized, badRequest, serverError } from "@/lib/api/response";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const createSchema = z.object({
  report_date: z.string(),
  platform: z.string().default("meta"),
  campaign_name: z.string().min(1),
  adset_name: z.string().optional().nullable(),
  ad_name: z.string().optional().nullable(),
  utm_campaign: z.string().optional().nullable(),
  utm_content: z.string().optional().nullable(),
  utm_term: z.string().optional().nullable(),
  spend: z.number().min(0),
  impressions: z.number().int().min(0).default(0),
  link_clicks: z.number().int().min(0).default(0),
  landing_page_views: z.number().int().min(0).default(0),
  notes: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  const { authenticated } = await authenticateRequest(request, "ad_spend:read");
  if (!authenticated) return unauthorized();

  const url = new URL(request.url);
  const { page, pageSize, from, to } = getPaginationParams(url);

  const supabase = await createServiceClient();
  let query = supabase
    .from("ad_spend_reports")
    .select("*", { count: "exact" })
    .order("report_date", { ascending: false })
    .range(from, to);

  const dateFrom = url.searchParams.get("from");
  const dateTo = url.searchParams.get("to");
  const utmCampaign = url.searchParams.get("utm_campaign");

  if (dateFrom) query = query.gte("report_date", dateFrom);
  if (dateTo) query = query.lte("report_date", dateTo);
  if (utmCampaign) query = query.ilike("utm_campaign", `%${utmCampaign}%`);

  const { data, count, error } = await query;
  if (error) return serverError(error.message);

  return apiSuccessWithMeta(data || [], { page, pageSize, total: count || 0 });
}

export async function POST(request: Request) {
  const { authenticated } = await authenticateRequest(request, "ad_spend:write");
  if (!authenticated) return unauthorized();

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed", parsed.error.issues);

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("ad_spend_reports")
    .insert(parsed.data)
    .select()
    .single();

  if (error) return serverError(error.message);
  return apiSuccess(data, 201);
}
