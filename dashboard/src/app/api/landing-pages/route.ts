import { authenticateRequest } from "@/lib/api/auth";
import { getPaginationParams } from "@/lib/api/pagination";
import { apiSuccessWithMeta, apiSuccess, unauthorized, badRequest, serverError } from "@/lib/api/response";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  intro: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  meta_title: z.string().optional().nullable(),
  meta_description: z.string().optional().nullable(),
  featured_image_url: z.string().url().optional().nullable().or(z.literal("")),
  disclosure_text: z.string().optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  custom_head_script: z.string().optional().nullable(),
  custom_body_script: z.string().optional().nullable(),
  products: z.array(z.object({
    product_id: z.string().uuid(),
    sort_order: z.number().default(0),
    custom_title: z.string().optional().nullable(),
    custom_description: z.string().optional().nullable(),
    custom_cta: z.string().default("Cek di Shopee"),
  })).optional(),
});

export async function GET(request: Request) {
  const { authenticated } = await authenticateRequest(request, "landing_pages:read");
  if (!authenticated) return unauthorized();

  const url = new URL(request.url);
  const { page, pageSize, from, to } = getPaginationParams(url);
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q");

  const supabase = await createServiceClient();
  let query = supabase
    .from("landing_pages")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status) query = query.eq("status", status);
  if (q) query = query.or(`title.ilike.%${q}%,slug.ilike.%${q}%`);

  const { data, count, error } = await query;
  if (error) return serverError(error.message);

  return apiSuccessWithMeta(data || [], { page, pageSize, total: count || 0 });
}

export async function POST(request: Request) {
  const { authenticated } = await authenticateRequest(request, "landing_pages:write");
  if (!authenticated) return unauthorized();

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed", parsed.error.issues);

  const { products, ...pageData } = parsed.data;
  const supabase = await createServiceClient();

  const { data: page, error } = await supabase
    .from("landing_pages")
    .insert(pageData)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return badRequest("Slug already exists");
    return serverError(error.message);
  }

  if (products && products.length > 0) {
    await supabase.from("landing_page_products").insert(
      products.map((p) => ({ ...p, landing_page_id: page.id }))
    );
  }

  return apiSuccess(page, 201);
}
