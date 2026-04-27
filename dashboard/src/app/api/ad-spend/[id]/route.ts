import { authenticateRequest } from "@/lib/api/auth";
import { apiSuccess, unauthorized, notFound, serverError } from "@/lib/api/response";
import { createServiceClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authenticated } = await authenticateRequest(request, "ad_spend:write");
  if (!authenticated) return unauthorized();

  const { id } = await params;
  const body = await request.json();
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("ad_spend_reports")
    .update({ ...body, updated_at: new Date().toISOString() })
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
