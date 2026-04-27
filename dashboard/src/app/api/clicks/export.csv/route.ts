import { authenticateRequest } from "@/lib/api/auth";
import { unauthorized, serverError } from "@/lib/api/response";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { authenticated } = await authenticateRequest(request, "clicks:read");
  if (!authenticated) return unauthorized();

  const url = new URL(request.url);
  const supabase = await createServiceClient();

  let query = supabase
    .from("click_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10000);

  const dateFrom = url.searchParams.get("from");
  const dateTo = url.searchParams.get("to");
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59`);

  const { data, error } = await query;
  if (error) return serverError(error.message);

  const headers = [
    "id", "created_at", "product_slug", "landing_page_slug",
    "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
    "device_type", "browser", "os", "is_duplicate", "is_bot",
  ];

  const rows = (data || []).map((row) =>
    headers.map((h) => {
      const val = (row as Record<string, unknown>)[h];
      const str = String(val ?? "");
      return str.includes(",") ? `"${str}"` : str;
    }).join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename=clicks_${new Date().toISOString().split("T")[0]}.csv`,
    },
  });
}
