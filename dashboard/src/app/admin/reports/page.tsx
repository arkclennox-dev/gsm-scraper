"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/admin/header";
import { MetricCard } from "@/components/admin/metric-card";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { ClicksChart } from "@/components/charts/clicks-chart";
import { SpendChart } from "@/components/charts/spend-chart";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface ReportData {
  redirectClicks: number;
  nonDuplicateClicks: number;
  botClicks: number;
  duplicateClicks: number;
  spend: number;
  impressions: number;
  metaLinkClicks: number;
  metaLandingPageViews: number;
  costPerRedirectClick: number;
  costPerNonDuplicateClick: number;
  metaCpc: number;
  clickGap: number;
  duplicateRate: number;
  botRate: number;
  clicksByDay: { date: string; clicks: number }[];
  spendByDay: { date: string; spend: number }[];
  byCampaign: { campaign: string; clicks: number; spend: number; cpc: number }[];
  byProduct: { product: string; clicks: number }[];
  warnings: string[];
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState("date");
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [dateTo, setDateTo] = useState(
    new Date().toISOString().split("T")[0]
  );

  const fetchReport = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const [{ data: clicks }, { data: adSpend }] = await Promise.all([
      supabase
        .from("click_events")
        .select("*")
        .gte("created_at", dateFrom)
        .lte("created_at", `${dateTo}T23:59:59`),
      supabase
        .from("ad_spend_reports")
        .select("*")
        .gte("report_date", dateFrom)
        .lte("report_date", dateTo),
    ]);

    const allClicks = clicks || [];
    const allSpend = adSpend || [];

    const redirectClicks = allClicks.length;
    const nonDuplicateClicks = allClicks.filter((c) => !c.is_duplicate).length;
    const botClicks = allClicks.filter((c) => c.is_bot).length;
    const duplicateClicks = allClicks.filter((c) => c.is_duplicate).length;
    const spend = allSpend.reduce((s, r) => s + Number(r.spend), 0);
    const impressions = allSpend.reduce((s, r) => s + Number(r.impressions), 0);
    const metaLinkClicks = allSpend.reduce((s, r) => s + Number(r.link_clicks), 0);
    const metaLandingPageViews = allSpend.reduce((s, r) => s + Number(r.landing_page_views), 0);

    const costPerRedirectClick = redirectClicks > 0 ? spend / redirectClicks : 0;
    const costPerNonDuplicateClick = nonDuplicateClicks > 0 ? spend / nonDuplicateClicks : 0;
    const metaCpc = metaLinkClicks > 0 ? spend / metaLinkClicks : 0;
    const clickGap = metaLinkClicks - redirectClicks;
    const duplicateRate = redirectClicks > 0 ? duplicateClicks / redirectClicks : 0;
    const botRate = redirectClicks > 0 ? botClicks / redirectClicks : 0;

    const dayMap: Record<string, number> = {};
    allClicks.forEach((c) => {
      const day = c.created_at.split("T")[0];
      dayMap[day] = (dayMap[day] || 0) + 1;
    });
    const clicksByDay = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        clicks: count,
      }));

    const spendMap: Record<string, number> = {};
    allSpend.forEach((r) => {
      spendMap[r.report_date] = (spendMap[r.report_date] || 0) + Number(r.spend);
    });
    const spendByDay = Object.entries(spendMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, s]) => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        spend: s,
      }));

    const campaignMap: Record<string, { clicks: number; spend: number }> = {};
    allClicks.forEach((c) => {
      const key = c.utm_campaign || "unknown";
      if (!campaignMap[key]) campaignMap[key] = { clicks: 0, spend: 0 };
      campaignMap[key].clicks++;
    });
    allSpend.forEach((r) => {
      const key = r.utm_campaign || r.campaign_name || "unknown";
      if (!campaignMap[key]) campaignMap[key] = { clicks: 0, spend: 0 };
      campaignMap[key].spend += Number(r.spend);
    });
    const byCampaign = Object.entries(campaignMap)
      .map(([campaign, v]) => ({
        campaign,
        clicks: v.clicks,
        spend: v.spend,
        cpc: v.clicks > 0 ? v.spend / v.clicks : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks);

    const productMap: Record<string, number> = {};
    allClicks.forEach((c) => {
      const key = c.product_slug || "unknown";
      productMap[key] = (productMap[key] || 0) + 1;
    });
    const byProduct = Object.entries(productMap)
      .map(([product, count]) => ({ product, clicks: count }))
      .sort((a, b) => b.clicks - a.clicks);

    const warnings: string[] = [];
    if (spend > 0 && redirectClicks === 0) warnings.push("Spend > 0 but no internal redirect clicks recorded.");
    if (clickGap > metaLinkClicks * 0.3) warnings.push("Meta link clicks much higher than internal redirect clicks.");
    if (duplicateRate > 0.2) warnings.push("Duplicate click rate is above 20%.");
    if (botRate > 0.1) warnings.push("Bot click rate is above 10%.");

    setData({
      redirectClicks,
      nonDuplicateClicks,
      botClicks,
      duplicateClicks,
      spend,
      impressions,
      metaLinkClicks,
      metaLandingPageViews,
      costPerRedirectClick,
      costPerNonDuplicateClick,
      metaCpc,
      clickGap,
      duplicateRate,
      botRate,
      clicksByDay,
      spendByDay,
      byCampaign,
      byProduct,
      warnings,
    });
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  if (loading || !data) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Reports"
        subtitle="Performance analytics and cost analysis"
        onRefresh={fetchReport}
      />

      <div className="p-6 space-y-6">
        <div className="flex gap-3">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40"
            label="From"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
            label="To"
          />
        </div>

        {data.warnings.length > 0 && (
          <div className="space-y-2">
            {data.warnings.map((w, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-400"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {w}
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Redirect Clicks" value={formatNumber(data.redirectClicks)} />
          <MetricCard title="Non-Duplicate Clicks" value={formatNumber(data.nonDuplicateClicks)} />
          <MetricCard title="Spend" value={formatCurrency(data.spend)} />
          <MetricCard title="Cost/Click" value={formatCurrency(data.costPerRedirectClick)} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Meta Link Clicks" value={formatNumber(data.metaLinkClicks)} />
          <MetricCard title="Meta CPC" value={formatCurrency(data.metaCpc)} />
          <MetricCard title="Click Gap" value={formatNumber(data.clickGap)} />
          <MetricCard title="Duplicate Rate" value={`${(data.duplicateRate * 100).toFixed(1)}%`} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ClicksChart data={data.clicksByDay} />
          <SpendChart data={data.spendByDay} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>By Campaign</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Spend</TableHead>
                <TableHead>CPC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.byCampaign.slice(0, 10).map((row) => (
                <TableRow key={row.campaign}>
                  <TableCell className="font-medium text-gray-200">
                    {row.campaign}
                  </TableCell>
                  <TableCell>{formatNumber(row.clicks)}</TableCell>
                  <TableCell>{formatCurrency(row.spend)}</TableCell>
                  <TableCell>{formatCurrency(row.cpc)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By Product</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Clicks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.byProduct.slice(0, 10).map((row) => (
                <TableRow key={row.product}>
                  <TableCell className="font-medium text-gray-200">
                    {row.product}
                  </TableCell>
                  <TableCell>{formatNumber(row.clicks)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
