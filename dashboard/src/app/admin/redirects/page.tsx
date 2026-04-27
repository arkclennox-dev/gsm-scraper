"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/admin/header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import type { AffiliateProduct } from "@/lib/types";
import { Link2, Copy, ExternalLink } from "lucide-react";

export default function RedirectBuilderPage() {
  const [products, setProducts] = useState<AffiliateProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [builder, setBuilder] = useState({
    slug: "",
    utmSource: "meta",
    utmMedium: "paid",
    utmCampaign: "",
    utmContent: "",
    utmTerm: "",
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("affiliate_products")
      .select("*")
      .eq("status", "active")
      .order("title");
    setProducts((data || []) as AffiliateProduct[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const generatedUrl = (() => {
    if (!builder.slug) return "";
    const base = `${typeof window !== "undefined" ? window.location.origin : ""}/go/${builder.slug}`;
    const params = new URLSearchParams();
    if (builder.utmSource) params.set("utm_source", builder.utmSource);
    if (builder.utmMedium) params.set("utm_medium", builder.utmMedium);
    if (builder.utmCampaign) params.set("utm_campaign", builder.utmCampaign);
    if (builder.utmContent) params.set("utm_content", builder.utmContent);
    if (builder.utmTerm) params.set("utm_term", builder.utmTerm);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  })();

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast("success", "URL copied to clipboard");
  };

  return (
    <div>
      <Header
        title="Redirect Builder"
        subtitle="Build redirect URLs with UTM tracking"
        onRefresh={fetchProducts}
      />

      <div className="p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Active Redirect Links</CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell className="text-center py-8 text-gray-500" colSpan={4}>
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : products.length === 0 ? (
                    <TableRow>
                      <TableCell className="text-center py-8 text-gray-500" colSpan={4}>
                        No active products
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium text-gray-200">
                          {p.title}
                        </TableCell>
                        <TableCell className="text-xs text-gray-400 font-mono">
                          /go/{p.slug}
                        </TableCell>
                        <TableCell>
                          <Badge variant="active">Active</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <button
                              onClick={() =>
                                setBuilder({ ...builder, slug: p.slug })
                              }
                              className="rounded p-1.5 text-gray-400 hover:bg-[#1a1f2e] hover:text-gray-200"
                              title="Use in builder"
                            >
                              <Link2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() =>
                                copyUrl(
                                  `${window.location.origin}/go/${p.slug}`
                                )
                              }
                              className="rounded p-1.5 text-gray-400 hover:bg-[#1a1f2e] hover:text-gray-200"
                              title="Copy URL"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Redirect Link Builder</CardTitle>
              </CardHeader>
              <div className="space-y-3">
                <Select
                  id="slug"
                  label="Product Slug"
                  value={builder.slug}
                  onChange={(e) =>
                    setBuilder({ ...builder, slug: e.target.value })
                  }
                  options={[
                    { value: "", label: "Select product..." },
                    ...products.map((p) => ({
                      value: p.slug,
                      label: p.title,
                    })),
                  ]}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    id="utm_source"
                    label="Source"
                    value={builder.utmSource}
                    onChange={(e) =>
                      setBuilder({ ...builder, utmSource: e.target.value })
                    }
                    placeholder="meta"
                  />
                  <Input
                    id="utm_medium"
                    label="Medium"
                    value={builder.utmMedium}
                    onChange={(e) =>
                      setBuilder({ ...builder, utmMedium: e.target.value })
                    }
                    placeholder="paid"
                  />
                </div>
                <Input
                  id="utm_campaign"
                  label="Campaign"
                  value={builder.utmCampaign}
                  onChange={(e) =>
                    setBuilder({ ...builder, utmCampaign: e.target.value })
                  }
                  placeholder="{{campaign.name}}"
                />
                <Input
                  id="utm_content"
                  label="Content"
                  value={builder.utmContent}
                  onChange={(e) =>
                    setBuilder({ ...builder, utmContent: e.target.value })
                  }
                  placeholder="{{ad.name}}"
                />
                <Input
                  id="utm_term"
                  label="Term"
                  value={builder.utmTerm}
                  onChange={(e) =>
                    setBuilder({ ...builder, utmTerm: e.target.value })
                  }
                  placeholder="{{adset.name}}"
                />

                <Button
                  className="w-full"
                  disabled={!builder.slug}
                  onClick={() => copyUrl(generatedUrl)}
                >
                  <Link2 className="h-4 w-4" />
                  Generate Link
                </Button>

                {generatedUrl && (
                  <div className="rounded-lg border border-[#2a3040] bg-[#0f1219] p-3">
                    <p className="break-all text-xs text-gray-400">
                      {generatedUrl}
                    </p>
                    <button
                      onClick={() => copyUrl(generatedUrl)}
                      className="mt-2 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
