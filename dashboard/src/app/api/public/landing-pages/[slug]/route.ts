import { apiSuccess, notFound, serverError } from "@/lib/api/response";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createServiceClient();

  const { data: page, error } = await supabase
    .from("landing_pages")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error || !page) return notFound("Landing page not found");

  const { data: products } = await supabase
    .from("landing_page_products")
    .select("*, product:affiliate_products(*)")
    .eq("landing_page_id", page.id)
    .order("sort_order");

  return apiSuccess({
    ...page,
    products: (products || []).filter(
      (pp: { product: { status: string } | null }) =>
        pp.product && pp.product.status === "active"
    ),
  });
}
