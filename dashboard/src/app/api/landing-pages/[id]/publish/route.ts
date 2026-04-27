import { authenticateRequest } from "@/lib/api/auth";
import { apiSuccess, unauthorized, serverError } from "@/lib/api/response";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authenticated } = await authenticateRequest(request, "landing_pages:write");
  if (!authenticated) return unauthorized();

  const { id } = await params;
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("landing_pages")
    .update({ status: "published", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return serverError(error.message);
  return apiSuccess(data);
}
