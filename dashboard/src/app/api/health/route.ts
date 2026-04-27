import { apiSuccess } from "@/lib/api/response";

export async function GET() {
  return apiSuccess({
    status: "ok",
    app: "Affiliate Click Dashboard",
    timestamp: new Date().toISOString(),
  });
}
