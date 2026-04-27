import { authenticateRequest } from "@/lib/api/auth";
import { apiSuccess, unauthorized, serverError } from "@/lib/api/response";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { authenticated } = await authenticateRequest(request, "products:read");
  if (!authenticated) return unauthorized();

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("affiliate_products")
    .select("id, title, slug, destination_url, status")
    .eq("status", "active")
    .order("title");

  if (error) return serverError(error.message);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const redirects = (data || []).map((p) => ({
    ...p,
    redirect_url: `${siteUrl}/go/${p.slug}`,
  }));

  return apiSuccess(redirects);
}
