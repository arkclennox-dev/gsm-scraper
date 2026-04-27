"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/admin/header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import type { SiteSettings } from "@/lib/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("site_settings")
      .select("*")
      .limit(1)
      .single();
    setSettings(data as SiteSettings | null);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("site_settings")
      .update({
        site_name: settings.site_name,
        site_url: settings.site_url,
        default_disclosure_text: settings.default_disclosure_text,
        meta_pixel_id: settings.meta_pixel_id,
        ga4_measurement_id: settings.ga4_measurement_id,
        global_head_script: settings.global_head_script,
        global_body_script: settings.global_body_script,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id);

    if (error) {
      toast("error", error.message);
    } else {
      toast("success", "Settings saved");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div>
        <Header title="Settings" subtitle="Configure your dashboard" />
        <div className="p-6">
          <Card>
            <p className="text-gray-500">
              No settings found. Run the database migration first.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Settings" subtitle="Configure your dashboard and tracking" />

      <div className="p-6 space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <Input
              id="site_name"
              label="Site Name"
              value={settings.site_name || ""}
              onChange={(e) =>
                setSettings({ ...settings, site_name: e.target.value })
              }
            />
            <Input
              id="site_url"
              label="Site URL"
              value={settings.site_url || ""}
              onChange={(e) =>
                setSettings({ ...settings, site_url: e.target.value })
              }
              placeholder="https://yourdomain.com"
            />
            <Textarea
              id="default_disclosure_text"
              label="Default Disclosure Text"
              value={settings.default_disclosure_text || ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  default_disclosure_text: e.target.value,
                })
              }
              rows={3}
            />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tracking</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <Input
              id="meta_pixel_id"
              label="Meta Pixel ID"
              value={settings.meta_pixel_id || ""}
              onChange={(e) =>
                setSettings({ ...settings, meta_pixel_id: e.target.value })
              }
              placeholder="1234567890"
            />
            <Input
              id="ga4_measurement_id"
              label="GA4 Measurement ID"
              value={settings.ga4_measurement_id || ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  ga4_measurement_id: e.target.value,
                })
              }
              placeholder="G-XXXXXXXXXX"
            />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Custom Scripts</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <Textarea
              id="global_head_script"
              label="Global Head Script"
              value={settings.global_head_script || ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  global_head_script: e.target.value,
                })
              }
              rows={4}
              placeholder="<script>...</script>"
            />
            <Textarea
              id="global_body_script"
              label="Global Body Script"
              value={settings.global_body_script || ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  global_body_script: e.target.value,
                })
              }
              rows={4}
              placeholder="<script>...</script>"
            />
          </div>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
