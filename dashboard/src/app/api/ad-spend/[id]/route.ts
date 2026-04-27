import { authenticateRequest } from "@/lib/api/auth";
import { apiSuccess, unauthorized, notFound, badRequest, serverError } from "@/lib/api/response";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const updateSchema = z.object({
  report_date: z.string(),
  platform: z.string(),
  campaign_name: z.string().min(1),
  adset_name: z.string().optional().nullable(),
  ad_name: z.string().optional().nullable(),
  utm_campaign: z.string().optional().nullable(),
  utm_content: z.string().optional().nullable(),
  utm_term: z.string().optional().nullable(),
  spend: z.number().min(0),
  impressions: z.number().int().min(0),
  link_clicks: z.number().int().min(0),
  landing_page_views: z.number().int().min(0),
  notes: z.string().optional().nullable(),
}).partial();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authenticated } = await authenticateRequest(request, "ad_spend:write");
  if (!authenticated) return unauthorized();

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed", parsed.error.issues);

  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("ad_spend_reports")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) return notFound("Report not found");
  return apiSuccess(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authenticated } = await authenticateRequest(request, "ad_spend:write");
  if (!authenticated) return unauthorized();

  const { id } = await params;
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("ad_spend_reports")
    .delete()
    .eq("id", id);

  if (error) return serverError(error.message);
  return new Response(null, { status: 204 });
}
