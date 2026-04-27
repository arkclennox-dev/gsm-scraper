import { authenticateRequest } from "@/lib/api/auth";
import { apiSuccess, unauthorized, notFound, serverError } from "@/lib/api/response";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authenticated } = await authenticateRequest(request, "landing_pages:write");
  if (!authenticated) return unauthorized();

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const supabase = await createServiceClient();

  const { data: original } = await supabase
    .from("landing_pages")
    .select("*")
    .eq("id", id)
    .single();

  if (!original) return notFound("Landing page not found");

  const { data, error } = await supabase
    .from("landing_pages")
    .insert({
      title: body.title || `${original.title} Copy`,
      slug: body.slug || `${original.slug}-copy`,
      intro: original.intro,
      content: original.content,
      meta_title: original.meta_title,
      meta_description: original.meta_description,
      featured_image_url: original.featured_image_url,
      disclosure_text: original.disclosure_text,
      status: body.status || "draft",
      custom_head_script: original.custom_head_script,
      custom_body_script: original.custom_body_script,
    })
    .select()
    .single();

  if (error) return serverError(error.message);
  return apiSuccess(data, 201);
}
