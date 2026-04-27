import { authenticateRequest } from "@/lib/api/auth";
import { apiSuccess, unauthorized, serverError } from "@/lib/api/response";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authenticated } = await authenticateRequest(request, "api_keys:manage");
  if (!authenticated) return unauthorized();

  const { id } = await params;
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("api_keys")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return serverError(error.message);
  return apiSuccess(data);
}
