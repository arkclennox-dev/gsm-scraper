"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/admin/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import type { ApiKey } from "@/lib/types";
import { Plus, Copy, Ban } from "lucide-react";

const AVAILABLE_SCOPES = [
  "read",
  "products:read",
  "products:write",
  "landing_pages:read",
  "landing_pages:write",
  "clicks:read",
  "clicks:write",
  "ad_spend:read",
  "ad_spend:write",
  "reports:read",
  "settings:read",
  "settings:write",
  "api_keys:manage",
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "",
    scopes: ["read"] as string[],
    expires_at: "",
  });

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("api_keys")
      .select("*")
      .order("created_at", { ascending: false });
    setKeys((data || []) as ApiKey[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async () => {
    if (!form.name) {
      toast("error", "Name is required");
      return;
    }

    const res = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const result = await res.json();
    if (!result.success) {
      toast("error", result.error?.message || "Failed to create key");
      return;
    }

    setGeneratedKey(result.data.key);
    toast("success", "API key created");
    fetchKeys();
  };

  const handleRevoke = async (id: string) => {
    const res = await fetch(`/api/api-keys/${id}/revoke`, {
      method: "POST",
    });
    const result = await res.json();
    if (result.success) {
      toast("success", "API key revoked");
      fetchKeys();
    }
  };

  const toggleScope = (scope: string) => {
    setForm((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter((s) => s !== scope)
        : [...prev.scopes, scope],
    }));
  };

  return (
    <div>
      <Header
        title="API Keys"
        subtitle="Manage API keys for server-to-server access"
        onRefresh={fetchKeys}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setForm({ name: "", scopes: ["read"], expires_at: "" });
              setGeneratedKey(null);
              setShowModal(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Create Key
          </Button>
        }
      />

      <div className="p-6">
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead>Scopes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell className="text-center py-8 text-gray-500" colSpan={7}>
                    Loading...
                  </TableCell>
                </TableRow>
              ) : keys.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center py-8 text-gray-500" colSpan={7}>
                    No API keys yet
                  </TableCell>
                </TableRow>
              ) : (
                keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium text-gray-200">
                      {key.name}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-gray-400">
                      {key.key_prefix}...
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {key.scopes.slice(0, 3).map((s) => (
                          <Badge key={s} variant="default" className="text-[10px]">
                            {s}
                          </Badge>
                        ))}
                        {key.scopes.length > 3 && (
                          <Badge variant="default" className="text-[10px]">
                            +{key.scopes.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          key.status === "active" ? "active" : "inactive"
                        }
                      >
                        {key.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {key.last_used_at
                        ? new Date(key.last_used_at).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(key.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {key.status === "active" && (
                        <button
                          onClick={() => handleRevoke(key.id)}
                          className="rounded p-1.5 text-gray-400 hover:bg-[#1a1f2e] hover:text-red-400"
                          title="Revoke"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
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
          setGeneratedKey(null);
        }}
        title={generatedKey ? "API Key Created" : "Create API Key"}
        className="max-w-lg"
      >
        {generatedKey ? (
          <div className="space-y-4">
            <p className="text-sm text-amber-400">
              Copy this key now. You will not be able to see it again.
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-[#2a3040] bg-[#0f1219] p-3">
              <code className="flex-1 break-all text-sm text-gray-200">
                {generatedKey}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedKey);
                  toast("success", "Key copied");
                }}
                className="rounded p-1.5 text-gray-400 hover:text-gray-200"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                setShowModal(false);
                setGeneratedKey(null);
              }}
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              id="key_name"
              label="Key Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Hermes Agent Key"
            />
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Scopes
              </label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_SCOPES.map((scope) => (
                  <button
                    key={scope}
                    onClick={() => toggleScope(scope)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      form.scopes.includes(scope)
                        ? "border-blue-500 bg-blue-500/20 text-blue-400"
                        : "border-[#2a3040] text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {scope}
                  </button>
                ))}
              </div>
            </div>
            <Input
              id="expires_at"
              label="Expires At (optional)"
              type="date"
              value={form.expires_at}
              onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Create Key</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
