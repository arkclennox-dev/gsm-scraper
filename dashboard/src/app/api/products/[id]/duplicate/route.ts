import { authenticateRequest } from "@/lib/api/auth";
import { apiSuccess, unauthorized, notFound, serverError } from "@/lib/api/response";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authenticated } = await authenticateRequest(request, "products:write");
  if (!authenticated) return unauthorized();

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const supabase = await createServiceClient();

  const { data: original } = await supabase
    .from("affiliate_products")
    .select("*")
    .eq("id", id)
    .single();

  if (!original) return notFound("Product not found");

  const { data, error } = await supabase
    .from("affiliate_products")
    .insert({
      title: body.title || `${original.title} Copy`,
      slug: body.slug || `${original.slug}-copy`,
      description: original.description,
      image_url: original.image_url,
      destination_url: original.destination_url,
      category: original.category,
      source_platform: original.source_platform,
      status: "active",
      notes: original.notes,
    })
    .select()
    .single();

  if (error) return serverError(error.message);
  return apiSuccess(data, 201);
}
