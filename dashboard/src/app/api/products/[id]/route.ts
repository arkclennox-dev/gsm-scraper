import { authenticateRequest } from "@/lib/api/auth";
import { apiSuccess, unauthorized, notFound, serverError } from "@/lib/api/response";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authenticated } = await authenticateRequest(request, "products:read");
  if (!authenticated) return unauthorized();

  const { id } = await params;
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("affiliate_products")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return notFound("Product not found");
  return apiSuccess(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authenticated } = await authenticateRequest(request, "products:write");
  if (!authenticated) return unauthorized();

  const { id } = await params;
  const body = await request.json();
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("affiliate_products")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) return notFound("Product not found");
  return apiSuccess(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authenticated } = await authenticateRequest(request, "products:write");
  if (!authenticated) return unauthorized();

  const { id } = await params;
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("affiliate_products")
    .update({ status: "inactive", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return serverError(error.message);
  return new Response(null, { status: 204 });
}
