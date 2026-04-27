import { authenticateRequest } from "@/lib/api/auth";
import { apiSuccess, unauthorized, badRequest, serverError } from "@/lib/api/response";
import { createServiceClient } from "@/lib/supabase/server";
import crypto from "crypto";

function generateApiKey(): string {
  const bytes = crypto.randomBytes(24);
  return `aff_live_${bytes.toString("base64url")}`;
}

export async function GET(request: Request) {
  const { authenticated } = await authenticateRequest(request);
  if (!authenticated) return unauthorized();

  const supabase = await createServiceClient();
  const { data } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, scopes, status, last_used_at, expires_at, created_at")
    .order("created_at", { ascending: false });

  return apiSuccess(data || []);
}

export async function POST(request: Request) {
  const { authenticated } = await authenticateRequest(request, "api_keys:manage");
  if (!authenticated) return unauthorized();

  const body = await request.json();
  const { name, scopes, expires_at } = body;

  if (!name) return badRequest("Name is required");

  const secret = process.env.API_KEY_SECRET;
  if (!secret) return serverError("API_KEY_SECRET not configured");

  const rawKey = generateApiKey();
  const keyPrefix = rawKey.slice(0, 16);
  const keyHash = crypto.createHmac("sha256", secret).update(rawKey).digest("hex");

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      name,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      scopes: scopes || ["read"],
      expires_at: expires_at || null,
    })
    .select()
    .single();

  if (error) return serverError(error.message);

  return apiSuccess({ ...data, key: rawKey }, 201);
}
