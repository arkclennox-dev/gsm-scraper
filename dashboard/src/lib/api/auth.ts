import { createClient, createServiceClient } from "@/lib/supabase/server";
import crypto from "crypto";

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function validateApiKey(
  apiKey: string,
  requiredScope?: string
): Promise<{ valid: boolean; keyId?: string }> {
  if (!apiKey) return { valid: false };

  const secret = process.env.API_KEY_SECRET;
  if (!secret) return { valid: false };

  const keyHash = crypto
    .createHmac("sha256", secret)
    .update(apiKey)
    .digest("hex");

  const supabase = await createServiceClient();
  const { data: key } = await supabase
    .from("api_keys")
    .select("*")
    .eq("key_hash", keyHash)
    .eq("status", "active")
    .single();

  if (!key) return { valid: false };

  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    return { valid: false };
  }

  if (requiredScope) {
    const scopes: string[] = key.scopes || [];
    const hasScope =
      scopes.includes("read") && requiredScope.endsWith(":read")
        ? true
        : scopes.includes(requiredScope);
    if (!hasScope) return { valid: false };
  }

  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", key.id);

  return { valid: true, keyId: key.id };
}

export async function authenticateRequest(
  request: Request,
  requiredScope?: string
): Promise<{ authenticated: boolean; isApiKey: boolean }> {
  const apiKey = request.headers.get("x-api-key");
  if (apiKey) {
    const result = await validateApiKey(apiKey, requiredScope);
    return { authenticated: result.valid, isApiKey: true };
  }

  const user = await getAuthenticatedUser();
  return { authenticated: !!user, isApiKey: false };
}
