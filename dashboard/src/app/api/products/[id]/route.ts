import { authenticateRequest } from "@/lib/api/auth";
import { apiSuccess, unauthorized, notFound, badRequest, serverError } from "@/lib/api/response";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z.string().optional().nullable(),
  image_url: z.string().url().optional().nullable().or(z.literal("")),
  destination_url: z.string().url(),
  category: z.string().optional().nullable(),
  source_platform: z.string(),
  status: z.enum(["active", "inactive"]),
  notes: z.string().optional().nullable(),
}).partial();

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
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed", parsed.error.issues);

  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("affiliate_products")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
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
