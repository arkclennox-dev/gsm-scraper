"use client";

import { Header } from "@/components/admin/header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

const endpoints = [
  { method: "GET", path: "/api/health", auth: "Public", desc: "Health check" },
  { method: "GET", path: "/api/products", auth: "Admin / API Key (products:read)", desc: "List products" },
  { method: "POST", path: "/api/products", auth: "Admin / API Key (products:write)", desc: "Create product" },
  { method: "GET", path: "/api/products/[id]", auth: "Admin / API Key (products:read)", desc: "Get product" },
  { method: "PATCH", path: "/api/products/[id]", auth: "Admin / API Key (products:write)", desc: "Update product" },
  { method: "DELETE", path: "/api/products/[id]", auth: "Admin / API Key (products:write)", desc: "Deactivate product" },
  { method: "POST", path: "/api/products/[id]/duplicate", auth: "Admin / API Key (products:write)", desc: "Duplicate product" },
  { method: "GET", path: "/api/landing-pages", auth: "Admin / API Key (landing_pages:read)", desc: "List landing pages" },
  { method: "POST", path: "/api/landing-pages", auth: "Admin / API Key (landing_pages:write)", desc: "Create landing page" },
  { method: "GET", path: "/api/landing-pages/[id]", auth: "Admin / API Key (landing_pages:read)", desc: "Get landing page" },
  { method: "PATCH", path: "/api/landing-pages/[id]", auth: "Admin / API Key (landing_pages:write)", desc: "Update landing page" },
  { method: "DELETE", path: "/api/landing-pages/[id]", auth: "Admin / API Key (landing_pages:write)", desc: "Archive landing page" },
  { method: "POST", path: "/api/landing-pages/[id]/publish", auth: "Admin / API Key (landing_pages:write)", desc: "Publish page" },
  { method: "POST", path: "/api/landing-pages/[id]/unpublish", auth: "Admin / API Key (landing_pages:write)", desc: "Unpublish page" },
  { method: "GET", path: "/api/clicks", auth: "Admin / API Key (clicks:read)", desc: "List click events" },
  { method: "GET", path: "/api/clicks/export.csv", auth: "Admin / API Key (clicks:read)", desc: "Export clicks CSV" },
  { method: "GET", path: "/api/ad-spend", auth: "Admin / API Key (ad_spend:read)", desc: "List ad spend" },
  { method: "POST", path: "/api/ad-spend", auth: "Admin / API Key (ad_spend:write)", desc: "Add ad spend" },
  { method: "PATCH", path: "/api/ad-spend/[id]", auth: "Admin / API Key (ad_spend:write)", desc: "Update ad spend" },
  { method: "DELETE", path: "/api/ad-spend/[id]", auth: "Admin / API Key (ad_spend:write)", desc: "Delete ad spend" },
  { method: "GET", path: "/api/reports/overview", auth: "Admin / API Key (reports:read)", desc: "Overview report" },
  { method: "GET", path: "/api/reports/by-date", auth: "Admin / API Key (reports:read)", desc: "Report by date" },
  { method: "GET", path: "/api/reports/by-campaign", auth: "Admin / API Key (reports:read)", desc: "Report by campaign" },
  { method: "GET", path: "/api/reports/by-product", auth: "Admin / API Key (reports:read)", desc: "Report by product" },
  { method: "GET", path: "/api/reports/top-performers", auth: "Admin / API Key (reports:read)", desc: "Top performers" },
  { method: "GET", path: "/api/settings", auth: "Admin / API Key (settings:read)", desc: "Get settings" },
  { method: "PATCH", path: "/api/settings", auth: "Admin / API Key (settings:write)", desc: "Update settings" },
  { method: "GET", path: "/api/api-keys", auth: "Admin session only", desc: "List API keys" },
  { method: "POST", path: "/api/api-keys", auth: "Admin / API Key (api_keys:manage)", desc: "Create API key" },
  { method: "POST", path: "/api/api-keys/[id]/revoke", auth: "Admin / API Key (api_keys:manage)", desc: "Revoke API key" },
  { method: "GET", path: "/api/redirects", auth: "Admin / API Key (products:read)", desc: "List redirects" },
  { method: "GET", path: "/api/public/landing-pages/[slug]", auth: "Public", desc: "Get public landing page" },
];

const methodColors: Record<string, string> = {
  GET: "text-emerald-400",
  POST: "text-blue-400",
  PATCH: "text-amber-400",
  DELETE: "text-red-400",
};

export default function ApiDocsPage() {
  return (
    <div>
      <Header title="API Documentation" subtitle="Reference for all available API endpoints" />

      <div className="p-6 space-y-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
          </CardHeader>
          <div className="space-y-3 text-sm text-gray-300">
            <p>All API endpoints support two authentication methods:</p>
            <div className="rounded-lg border border-[#2a3040] bg-[#0f1219] p-4">
              <p className="font-medium text-gray-200">1. Admin Session</p>
              <p className="text-gray-400 mt-1">
                Log in via /admin/login. Session cookies are used automatically.
              </p>
            </div>
            <div className="rounded-lg border border-[#2a3040] bg-[#0f1219] p-4">
              <p className="font-medium text-gray-200">2. API Key</p>
              <p className="text-gray-400 mt-1">
                Include header: <code className="text-blue-400">x-api-key: aff_live_xxxxxxxx</code>
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Base URL</CardTitle>
          </CardHeader>
          <code className="text-sm text-blue-400">
            {typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com"}
          </code>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Endpoints</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {endpoints.map((ep, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-[#1e2433] bg-[#0f1219] p-3"
              >
                <span
                  className={`w-14 shrink-0 font-mono text-xs font-bold ${
                    methodColors[ep.method] || "text-gray-400"
                  }`}
                >
                  {ep.method}
                </span>
                <div className="flex-1 min-w-0">
                  <code className="text-sm text-gray-200">{ep.path}</code>
                  <p className="mt-0.5 text-xs text-gray-500">{ep.desc}</p>
                  <p className="mt-0.5 text-xs text-gray-600">{ep.auth}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Example: Create Product</CardTitle>
          </CardHeader>
          <pre className="overflow-x-auto rounded-lg bg-[#0f1219] p-4 text-xs text-gray-300">
{`curl -X POST "${typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com"}/api/products" \\
  -H "content-type: application/json" \\
  -H "x-api-key: aff_live_xxxxxxxx" \\
  -d '{
    "title": "Produk Test 01",
    "slug": "produk-test-01",
    "destination_url": "https://s.shopee.co.id/xxxxx",
    "source_platform": "shopee",
    "status": "active"
  }'`}
          </pre>
        </Card>
      </div>
    </div>
  );
}
