import { authenticateRequest } from "@/lib/api/auth";
import { apiSuccess, unauthorized, notFound, serverError } from "@/lib/api/response";
import { createServiceClient } from "@/lib/supabase/server";

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
  const supabase = await createServiceClient();

  const { data: existing } = await supabase
    .from("site_settings")
    .select("id")
    .limit(1)
    .single();

  if (!existing) return notFound("Settings not found");

  const { data, error } = await supabase
    .from("site_settings")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", existing.id)
    .select()
    .single();

  if (error) return serverError(error.message);
  return apiSuccess(data);
}
