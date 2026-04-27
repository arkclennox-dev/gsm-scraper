import { authenticateRequest } from "@/lib/api/auth";
import { apiSuccess, unauthorized, notFound, badRequest, serverError } from "@/lib/api/response";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  intro: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  meta_title: z.string().optional().nullable(),
  meta_description: z.string().optional().nullable(),
  featured_image_url: z.string().url().optional().nullable().or(z.literal("")),
  disclosure_text: z.string().optional().nullable(),
  status: z.enum(["draft", "published", "archived"]),
  custom_head_script: z.string().optional().nullable(),
  custom_body_script: z.string().optional().nullable(),
  products: z.array(z.object({
    product_id: z.string().uuid(),
    sort_order: z.number().default(0),
    custom_title: z.string().optional().nullable(),
    custom_description: z.string().optional().nullable(),
    custom_cta: z.string().default("Cek di Shopee"),
  })).optional(),
}).partial();

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
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed", parsed.error.issues);

  const { products, ...pageData } = parsed.data;
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
        products.map((p) => ({
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
