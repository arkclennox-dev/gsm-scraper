import { authenticateRequest } from "@/lib/api/auth";
import { getPaginationParams } from "@/lib/api/pagination";
import {
  apiSuccessWithMeta,
  apiSuccess,
  unauthorized,
  badRequest,
  serverError,
} from "@/lib/api/response";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z.string().optional().nullable(),
  image_url: z.string().url().optional().nullable().or(z.literal("")),
  destination_url: z.string().url(),
  category: z.string().optional().nullable(),
  source_platform: z.string().default("shopee"),
  status: z.enum(["active", "inactive"]).default("active"),
  notes: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  const { authenticated } = await authenticateRequest(request, "products:read");
  if (!authenticated) return unauthorized();

  const url = new URL(request.url);
  const { page, pageSize, from, to } = getPaginationParams(url);
  const q = url.searchParams.get("q");
  const status = url.searchParams.get("status");

  const supabase = await createServiceClient();
  let query = supabase
    .from("affiliate_products")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (q) query = query.or(`title.ilike.%${q}%,slug.ilike.%${q}%`);
  if (status) query = query.eq("status", status);

  const { data, count, error } = await query;
  if (error) return serverError(error.message);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const enriched = (data || []).map((p) => ({
    ...p,
    redirect_url: `${siteUrl}/go/${p.slug}`,
  }));

  return apiSuccessWithMeta(enriched, { page, pageSize, total: count || 0 });
}

export async function POST(request: Request) {
  const { authenticated } = await authenticateRequest(
    request,
    "products:write"
  );
  if (!authenticated) return unauthorized();

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation failed", parsed.error.issues);
  }

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("affiliate_products")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return badRequest("Slug already exists");
    return serverError(error.message);
  }

  return apiSuccess(data, 201);
}
