import { authenticateRequest } from "@/lib/api/auth";
import { apiSuccess, unauthorized, notFound, serverError } from "@/lib/api/response";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authenticated } = await authenticateRequest(request, "landing_pages:read");
  if (!authenticated) return unauthorized();

  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: page } = await supabase
    .from("landing_pages")
    .select("*")
    .eq("id", id)
    .single();

  if (!page) return notFound("Landing page not found");

  const { data: products } = await supabase
    .from("landing_page_products")
    .select("*, product:affiliate_products(*)")
    .eq("landing_page_id", id)
    .order("sort_order");

  return apiSuccess({ ...page, products: products || [] });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authenticated } = await authenticateRequest(request, "landing_pages:write");
  if (!authenticated) return unauthorized();

  const { id } = await params;
  const body = await request.json();
  const { products, ...pageData } = body;

  const supabase = await createServiceClient();

  if (Object.keys(pageData).length > 0) {
    const { error } = await supabase
      .from("landing_pages")
      .update({ ...pageData, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return serverError(error.message);
  }

  if (products) {
    await supabase.from("landing_page_products").delete().eq("landing_page_id", id);
    if (products.length > 0) {
      await supabase.from("landing_page_products").insert(
        products.map((p: { product_id: string; sort_order?: number; custom_title?: string; custom_description?: string; custom_cta?: string }) => ({
          ...p,
          landing_page_id: id,
        }))
      );
    }
  }

  const { data } = await supabase.from("landing_pages").select("*").eq("id", id).single();
  return apiSuccess(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authenticated } = await authenticateRequest(request, "landing_pages:write");
  if (!authenticated) return unauthorized();

  const { id } = await params;
  const supabase = await createServiceClient();

  await supabase
    .from("landing_pages")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id);

  return new Response(null, { status: 204 });
}
