import { authenticateRequest } from "@/lib/api/auth";
import { apiSuccess, unauthorized, notFound, badRequest, serverError } from "@/lib/api/response";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const updateSchema = z.object({
  site_name: z.string().min(1),
  site_url: z.string().url().or(z.literal("")),
  disclosure_text: z.string(),
  meta_pixel_id: z.string(),
  ga4_measurement_id: z.string(),
  global_head_script: z.string(),
  global_body_script: z.string(),
}).partial();

export async function GET(request: Request) {
  const { authenticated } = await authenticateRequest(request, "settings:read");
  if (!authenticated) return unauthorized();

  const supabase = await createServiceClient();
  const { data } = await supabase
    .from("site_settings")
    .select("*")
    .limit(1)
    .single();

  if (!data) return notFound("Settings not found");
  return apiSuccess(data);
}

export async function PATCH(request: Request) {
  const { authenticated } = await authenticateRequest(request, "settings:write");
  if (!authenticated) return unauthorized();

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed", parsed.error.issues);

  const supabase = await createServiceClient();

  const { data: existing } = await supabase
    .from("site_settings")
    .select("id")
    .limit(1)
    .single();

  if (!existing) return notFound("Settings not found");

  const { data, error } = await supabase
    .from("site_settings")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", existing.id)
    .select()
    .single();

  if (error) return serverError(error.message);
  return apiSuccess(data);
}
