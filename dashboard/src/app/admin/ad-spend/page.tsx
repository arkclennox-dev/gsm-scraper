"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/admin/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
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
import type { AdSpendReport } from "@/lib/types";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function AdSpendPage() {
  const [reports, setReports] = useState<AdSpendReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingReport, setEditingReport] = useState<AdSpendReport | null>(null);
  const { toast } = useToast();

  const [form, setForm] = useState({
    report_date: new Date().toISOString().split("T")[0],
    platform: "meta",
    campaign_name: "",
    adset_name: "",
    ad_name: "",
    utm_campaign: "",
    utm_content: "",
    utm_term: "",
    spend: "",
    impressions: "",
    link_clicks: "",
    landing_page_views: "",
    notes: "",
  });

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("ad_spend_reports")
      .select("*")
      .order("report_date", { ascending: false });
    setReports((data || []) as AdSpendReport[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleSave = async () => {
    if (!form.campaign_name || !form.spend) {
      toast("error", "Campaign name and spend are required");
      return;
    }

    const payload = {
      ...form,
      spend: parseFloat(form.spend) || 0,
      impressions: parseInt(form.impressions) || 0,
      link_clicks: parseInt(form.link_clicks) || 0,
      landing_page_views: parseInt(form.landing_page_views) || 0,
    };

    const supabase = createClient();

    if (editingReport) {
      const { error } = await supabase
        .from("ad_spend_reports")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", editingReport.id);
      if (error) {
        toast("error", error.message);
        return;
      }
      toast("success", "Report updated");
    } else {
      const { error } = await supabase.from("ad_spend_reports").insert(payload);
      if (error) {
        toast("error", error.message);
        return;
      }
      toast("success", "Report added");
    }

    setShowModal(false);
    setEditingReport(null);
    resetForm();
    fetchReports();
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    await supabase.from("ad_spend_reports").delete().eq("id", id);
    toast("success", "Report deleted");
    fetchReports();
  };

  const resetForm = () => {
    setForm({
      report_date: new Date().toISOString().split("T")[0],
      platform: "meta",
      campaign_name: "",
      adset_name: "",
      ad_name: "",
      utm_campaign: "",
      utm_content: "",
      utm_term: "",
      spend: "",
      impressions: "",
      link_clicks: "",
      landing_page_views: "",
      notes: "",
    });
  };

  const openEdit = (report: AdSpendReport) => {
    setEditingReport(report);
    setForm({
      report_date: report.report_date,
      platform: report.platform,
      campaign_name: report.campaign_name,
      adset_name: report.adset_name || "",
      ad_name: report.ad_name || "",
      utm_campaign: report.utm_campaign || "",
      utm_content: report.utm_content || "",
      utm_term: report.utm_term || "",
      spend: String(report.spend),
      impressions: String(report.impressions),
      link_clicks: String(report.link_clicks),
      landing_page_views: String(report.landing_page_views),
      notes: report.notes || "",
    });
    setShowModal(true);
  };

  return (
    <div>
      <Header
        title="Ad Spend"
        subtitle="Input and manage Meta Ads spend data"
        onRefresh={fetchReports}
        actions={
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setEditingReport(null);
              setShowModal(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Report
          </Button>
        }
      />

      <div className="p-6">
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Adset</TableHead>
                <TableHead>Ad</TableHead>
                <TableHead>Spend</TableHead>
                <TableHead>Impressions</TableHead>
                <TableHead>Link Clicks</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell className="text-center py-8 text-gray-500" colSpan={8}>
                    Loading...
                  </TableCell>
                </TableRow>
              ) : reports.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center py-8 text-gray-500" colSpan={8}>
                    No ad spend reports yet
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>{report.report_date}</TableCell>
                    <TableCell className="font-medium text-gray-200">
                      {report.campaign_name}
                    </TableCell>
                    <TableCell>{report.adset_name || "—"}</TableCell>
                    <TableCell>{report.ad_name || "—"}</TableCell>
                    <TableCell>{formatCurrency(report.spend)}</TableCell>
                    <TableCell>{formatNumber(report.impressions)}</TableCell>
                    <TableCell>{formatNumber(report.link_clicks)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(report)}
                          className="rounded p-1.5 text-gray-400 hover:bg-[#1a1f2e] hover:text-gray-200"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(report.id)}
                          className="rounded p-1.5 text-gray-400 hover:bg-[#1a1f2e] hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
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

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingReport(null);
          resetForm();
        }}
        title={editingReport ? "Edit Ad Spend Report" : "Add Ad Spend Report"}
        className="max-w-xl"
      >
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="report_date"
              label="Date *"
              type="date"
              value={form.report_date}
              onChange={(e) => setForm({ ...form, report_date: e.target.value })}
            />
            <Input
              id="platform"
              label="Platform"
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
            />
          </div>
          <Input
            id="campaign_name"
            label="Campaign Name *"
            value={form.campaign_name}
            onChange={(e) =>
              setForm({ ...form, campaign_name: e.target.value })
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="adset_name"
              label="Adset Name"
              value={form.adset_name}
              onChange={(e) => setForm({ ...form, adset_name: e.target.value })}
            />
            <Input
              id="ad_name"
              label="Ad Name"
              value={form.ad_name}
              onChange={(e) => setForm({ ...form, ad_name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input
              id="utm_campaign"
              label="UTM Campaign"
              value={form.utm_campaign}
              onChange={(e) =>
                setForm({ ...form, utm_campaign: e.target.value })
              }
            />
            <Input
              id="utm_content"
              label="UTM Content"
              value={form.utm_content}
              onChange={(e) =>
                setForm({ ...form, utm_content: e.target.value })
              }
            />
            <Input
              id="utm_term"
              label="UTM Term"
              value={form.utm_term}
              onChange={(e) => setForm({ ...form, utm_term: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="spend"
              label="Spend *"
              type="number"
              value={form.spend}
              onChange={(e) => setForm({ ...form, spend: e.target.value })}
            />
            <Input
              id="impressions"
              label="Impressions"
              type="number"
              value={form.impressions}
              onChange={(e) =>
                setForm({ ...form, impressions: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="link_clicks"
              label="Link Clicks"
              type="number"
              value={form.link_clicks}
              onChange={(e) =>
                setForm({ ...form, link_clicks: e.target.value })
              }
            />
            <Input
              id="landing_page_views"
              label="Landing Page Views"
              type="number"
              value={form.landing_page_views}
              onChange={(e) =>
                setForm({ ...form, landing_page_views: e.target.value })
              }
            />
          </div>
          <Textarea
            id="notes"
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setShowModal(false);
              setEditingReport(null);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {editingReport ? "Update" : "Add"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
