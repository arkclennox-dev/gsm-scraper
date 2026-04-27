"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/admin/header";
import { MetricCard } from "@/components/admin/metric-card";
import { ClicksChart } from "@/components/charts/clicks-chart";
import { SpendChart } from "@/components/charts/spend-chart";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { ClickEvent } from "@/lib/types";

interface DashboardData {
  clicksToday: number;
  clicks7d: number;
  activeProducts: number;
  publishedPages: number;
  totalSpend: number;
  totalImpressions: number;
  recentClicks: ClickEvent[];
  clicksByDay: { date: string; clicks: number }[];
  spendByDay: { date: string; spend: number }[];
  topCampaign: string;
  topProduct: string;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: clicksToday },
      { count: clicks7d },
      { count: activeProducts },
      { count: publishedPages },
      { data: recentClicks },
      { data: adSpend },
      { data: clickEvents7d },
    ] = await Promise.all([
      supabase
        .from("click_events")
        .select("*", { count: "exact", head: true })
        .gte("created_at", todayStart),
      supabase
        .from("click_events")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo),
      supabase
        .from("affiliate_products")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("landing_pages")
        .select("*", { count: "exact", head: true })
        .eq("status", "published"),
      supabase
        .from("click_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("ad_spend_reports")
        .select("report_date, spend, impressions")
        .gte("report_date", sevenDaysAgo.split("T")[0]),
      supabase
        .from("click_events")
        .select("created_at, utm_campaign, product_slug")
        .gte("created_at", sevenDaysAgo),
    ]);

    const totalSpend = (adSpend || []).reduce(
      (sum, r) => sum + Number(r.spend),
      0
    );
    const totalImpressions = (adSpend || []).reduce(
      (sum, r) => sum + Number(r.impressions),
      0
    );

    const dayMap: Record<string, number> = {};
    (clickEvents7d || []).forEach((ev) => {
      const day = ev.created_at.split("T")[0];
      dayMap[day] = (dayMap[day] || 0) + 1;
    });
    const clicksByDay = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, clicks]) => ({
        date: new Date(date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        clicks,
      }));

    const spendMap: Record<string, number> = {};
    (adSpend || []).forEach((r) => {
      spendMap[r.report_date] = (spendMap[r.report_date] || 0) + Number(r.spend);
    });
    const spendByDay = Object.entries(spendMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, spend]) => ({
        date: new Date(date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        spend,
      }));

    const campaignCounts: Record<string, number> = {};
    const productCounts: Record<string, number> = {};
    (clickEvents7d || []).forEach((ev) => {
      if (ev.utm_campaign) campaignCounts[ev.utm_campaign] = (campaignCounts[ev.utm_campaign] || 0) + 1;
      if (ev.product_slug) productCounts[ev.product_slug] = (productCounts[ev.product_slug] || 0) + 1;
    });
    const topCampaign = Object.entries(campaignCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || "—";
    const topProduct = Object.entries(productCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || "—";

    setData({
      clicksToday: clicksToday || 0,
      clicks7d: clicks7d || 0,
      activeProducts: activeProducts || 0,
      publishedPages: publishedPages || 0,
      totalSpend,
      totalImpressions,
      recentClicks: (recentClicks || []) as ClickEvent[],
      clicksByDay,
      spendByDay,
      topCampaign,
      topProduct,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading || !data) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const cpc =
    data.clicks7d > 0 ? data.totalSpend / data.clicks7d : 0;

  return (
    <div>
      <Header
        title="Overview"
        subtitle="Monitor performance and manage your affiliate campaigns"
        onRefresh={fetchData}
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            title="Spend"
            value={formatCurrency(data.totalSpend)}
          />
          <MetricCard
            title="Clicks"
            value={formatNumber(data.clicks7d)}
          />
          <MetricCard
            title="CPC"
            value={formatCurrency(cpc)}
          />
          <MetricCard
            title="Active Products"
            value={formatNumber(data.activeProducts)}
          />
          <MetricCard
            title="Published Pages"
            value={formatNumber(data.publishedPages)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard title="Clicks Today" value={formatNumber(data.clicksToday)} />
          <MetricCard title="Top Campaign" value={data.topCampaign} />
          <MetricCard title="Top Product" value={data.topProduct} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ClicksChart data={data.clicksByDay} />
          <SpendChart data={data.spendByDay} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Clicks</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentClicks.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center text-gray-500 py-8" colSpan={6}>
                    No click events yet
                  </TableCell>
                </TableRow>
              ) : (
                data.recentClicks.map((click) => (
                  <TableRow key={click.id}>
                    <TableCell className="text-xs">
                      {new Date(click.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>{click.product_slug || "—"}</TableCell>
                    <TableCell>{click.utm_campaign || "—"}</TableCell>
                    <TableCell>{click.utm_source || "—"}</TableCell>
                    <TableCell>{click.device_type || "—"}</TableCell>
                    <TableCell>
                      {click.is_bot ? (
                        <Badge variant="inactive">Bot</Badge>
                      ) : click.is_duplicate ? (
                        <Badge variant="paused">Duplicate</Badge>
                      ) : (
                        <Badge variant="active">Valid</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
