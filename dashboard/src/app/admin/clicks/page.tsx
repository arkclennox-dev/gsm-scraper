"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/admin/header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import type { ClickEvent } from "@/lib/types";
import { Download, ChevronLeft, ChevronRight } from "lucide-react";

export default function ClicksPage() {
  const [clicks, setClicks] = useState<ClickEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const [filters, setFilters] = useState({
    product: "",
    campaign: "",
    source: "",
    from: "",
    to: "",
    includeDuplicates: "true",
    includeBots: "false",
  });

  const fetchClicks = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let query = supabase
      .from("click_events")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (filters.product) query = query.ilike("product_slug", `%${filters.product}%`);
    if (filters.campaign) query = query.ilike("utm_campaign", `%${filters.campaign}%`);
    if (filters.source) query = query.eq("utm_source", filters.source);
    if (filters.from) query = query.gte("created_at", filters.from);
    if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59`);
    if (filters.includeDuplicates === "false") query = query.eq("is_duplicate", false);
    if (filters.includeBots === "false") query = query.eq("is_bot", false);

    const { data, count } = await query;
    setClicks((data || []) as ClickEvent[]);
    setTotal(count || 0);
    setLoading(false);
  }, [page, filters]);

  useEffect(() => {
    fetchClicks();
  }, [fetchClicks]);

  const exportCsv = () => {
    const headers = [
      "created_at",
      "product_slug",
      "landing_page_slug",
      "utm_campaign",
      "utm_content",
      "utm_source",
      "utm_medium",
      "device_type",
      "is_duplicate",
      "is_bot",
    ];
    const rows = clicks.map((c) =>
      headers.map((h) => String((c as unknown as Record<string, unknown>)[h] ?? "")).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clicks_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <Header
        title="Click Events"
        subtitle={`${total} total click events`}
        onRefresh={fetchClicks}
        onExport={exportCsv}
      />

      <div className="p-6 space-y-4">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Product slug"
            value={filters.product}
            onChange={(e) => setFilters({ ...filters, product: e.target.value })}
            className="w-40"
          />
          <Input
            placeholder="Campaign"
            value={filters.campaign}
            onChange={(e) =>
              setFilters({ ...filters, campaign: e.target.value })
            }
            className="w-40"
          />
          <Select
            value={filters.source}
            onChange={(e) => setFilters({ ...filters, source: e.target.value })}
            options={[
              { value: "", label: "All Sources" },
              { value: "meta", label: "Meta" },
              { value: "google", label: "Google" },
              { value: "direct", label: "Direct" },
            ]}
            className="w-36"
          />
          <Input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            className="w-40"
          />
          <Input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            className="w-40"
          />
          <Select
            value={filters.includeDuplicates}
            onChange={(e) =>
              setFilters({ ...filters, includeDuplicates: e.target.value })
            }
            options={[
              { value: "true", label: "Include Duplicates" },
              { value: "false", label: "Exclude Duplicates" },
            ]}
            className="w-44"
          />
          <Select
            value={filters.includeBots}
            onChange={(e) =>
              setFilters({ ...filters, includeBots: e.target.value })
            }
            options={[
              { value: "false", label: "Exclude Bots" },
              { value: "true", label: "Include Bots" },
            ]}
            className="w-36"
          />
        </div>

        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Landing Page</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Content</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell className="text-center py-8 text-gray-500" colSpan={8}>
                    Loading...
                  </TableCell>
                </TableRow>
              ) : clicks.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center py-8 text-gray-500" colSpan={8}>
                    No click events found
                  </TableCell>
                </TableRow>
              ) : (
                clicks.map((click) => (
                  <TableRow key={click.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(click.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>{click.product_slug || "—"}</TableCell>
                    <TableCell>{click.landing_page_slug || "—"}</TableCell>
                    <TableCell>{click.utm_campaign || "—"}</TableCell>
                    <TableCell>{click.utm_content || "—"}</TableCell>
                    <TableCell>{click.utm_source || "—"}</TableCell>
                    <TableCell>{click.device_type || "—"}</TableCell>
                    <TableCell>
                      {click.is_bot ? (
                        <Badge variant="inactive">Bot</Badge>
                      ) : click.is_duplicate ? (
                        <Badge variant="paused">Dup</Badge>
                      ) : (
                        <Badge variant="active">OK</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages} ({total} results)
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
