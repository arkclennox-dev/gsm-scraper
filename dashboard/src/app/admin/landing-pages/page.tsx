"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/admin/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
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
import { slugify } from "@/lib/utils";
import type { LandingPage } from "@/lib/types";
import { Plus, Copy, Pencil, Trash2, Eye, ExternalLink } from "lucide-react";

export default function LandingPagesPage() {
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPage, setEditingPage] = useState<LandingPage | null>(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const [form, setForm] = useState({
    title: "",
    slug: "",
    intro: "",
    content: "",
    meta_title: "",
    meta_description: "",
    featured_image_url: "",
    disclosure_text: "",
    status: "draft",
    custom_head_script: "",
    custom_body_script: "",
  });

  const fetchPages = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("landing_pages")
      .select("*")
      .order("created_at", { ascending: false });
    setPages((data || []) as LandingPage[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const handleSave = async () => {
    if (!form.title || !form.slug) {
      toast("error", "Title and slug are required");
      return;
    }

    const supabase = createClient();

    if (editingPage) {
      const { error } = await supabase
        .from("landing_pages")
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq("id", editingPage.id);
      if (error) {
        toast("error", error.message);
        return;
      }
      toast("success", "Landing page updated");
    } else {
      const { error } = await supabase.from("landing_pages").insert(form);
      if (error) {
        toast("error", error.message);
        return;
      }
      toast("success", "Landing page created");
    }

    setShowModal(false);
    setEditingPage(null);
    resetForm();
    fetchPages();
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    await supabase
      .from("landing_pages")
      .update({ status: "archived" })
      .eq("id", id);
    toast("success", "Landing page archived");
    fetchPages();
  };

  const handleDuplicate = async (page: LandingPage) => {
    const supabase = createClient();
    await supabase.from("landing_pages").insert({
      title: `${page.title} Copy`,
      slug: `${page.slug}-copy`,
      intro: page.intro,
      content: page.content,
      meta_title: page.meta_title,
      meta_description: page.meta_description,
      featured_image_url: page.featured_image_url,
      disclosure_text: page.disclosure_text,
      status: "draft",
      custom_head_script: page.custom_head_script,
      custom_body_script: page.custom_body_script,
    });
    toast("success", "Landing page duplicated");
    fetchPages();
  };

  const togglePublish = async (page: LandingPage) => {
    const supabase = createClient();
    const newStatus = page.status === "published" ? "draft" : "published";
    await supabase
      .from("landing_pages")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", page.id);
    toast("success", `Landing page ${newStatus}`);
    fetchPages();
  };

  const copyUrl = (slug: string) => {
    const url = `${window.location.origin}/rekomendasi/${slug}`;
    navigator.clipboard.writeText(url);
    toast("success", "URL copied");
  };

  const resetForm = () => {
    setForm({
      title: "",
      slug: "",
      intro: "",
      content: "",
      meta_title: "",
      meta_description: "",
      featured_image_url: "",
      disclosure_text: "",
      status: "draft",
      custom_head_script: "",
      custom_body_script: "",
    });
  };

  const openEdit = (page: LandingPage) => {
    setEditingPage(page);
    setForm({
      title: page.title,
      slug: page.slug,
      intro: page.intro || "",
      content: page.content || "",
      meta_title: page.meta_title || "",
      meta_description: page.meta_description || "",
      featured_image_url: page.featured_image_url || "",
      disclosure_text: page.disclosure_text || "",
      status: page.status,
      custom_head_script: page.custom_head_script || "",
      custom_body_script: page.custom_body_script || "",
    });
    setShowModal(true);
  };

  const filtered = pages.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Header
        title="Landing Pages"
        subtitle="Manage public landing pages with affiliate products"
        onRefresh={fetchPages}
        actions={
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setEditingPage(null);
              setShowModal(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New Page
          </Button>
        }
      />

      <div className="p-6 space-y-4">
        <Input
          placeholder="Search pages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />

        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell className="text-center py-8 text-gray-500" colSpan={5}>
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center py-8 text-gray-500" colSpan={5}>
                    No landing pages found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell className="font-medium text-gray-200">
                      {page.title}
                    </TableCell>
                    <TableCell className="text-xs text-gray-400">
                      /rekomendasi/{page.slug}
                    </TableCell>
                    <TableCell>
                      <Badge variant={page.status as "draft" | "published" | "archived"}>
                        {page.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(page.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {page.status === "published" && (
                          <a
                            href={`/rekomendasi/${page.slug}`}
                            target="_blank"
                            className="rounded p-1.5 text-gray-400 hover:bg-[#1a1f2e] hover:text-gray-200"
                            title="Preview"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        <button
                          onClick={() => copyUrl(page.slug)}
                          className="rounded p-1.5 text-gray-400 hover:bg-[#1a1f2e] hover:text-gray-200"
                          title="Copy URL"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => togglePublish(page)}
                          className="rounded p-1.5 text-gray-400 hover:bg-[#1a1f2e] hover:text-gray-200"
                          title={page.status === "published" ? "Unpublish" : "Publish"}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(page)}
                          className="rounded p-1.5 text-gray-400 hover:bg-[#1a1f2e] hover:text-gray-200"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(page)}
                          className="rounded p-1.5 text-gray-400 hover:bg-[#1a1f2e] hover:text-gray-200"
                          title="Duplicate"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(page.id)}
                          className="rounded p-1.5 text-gray-400 hover:bg-[#1a1f2e] hover:text-red-400"
                          title="Archive"
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
          setEditingPage(null);
          resetForm();
        }}
        title={editingPage ? "Edit Landing Page" : "Create Landing Page"}
        className="max-w-xl"
      >
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          <Input
            id="title"
            label="Title *"
            value={form.title}
            onChange={(e) => {
              setForm({
                ...form,
                title: e.target.value,
                slug: editingPage ? form.slug : slugify(e.target.value),
                meta_title: editingPage ? form.meta_title : e.target.value,
              });
            }}
          />
          <Input
            id="slug"
            label="Slug *"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
          <Textarea
            id="intro"
            label="Intro"
            value={form.intro}
            onChange={(e) => setForm({ ...form, intro: e.target.value })}
            rows={2}
          />
          <Textarea
            id="content"
            label="Content"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={3}
          />
          <Input
            id="meta_title"
            label="Meta Title"
            value={form.meta_title}
            onChange={(e) => setForm({ ...form, meta_title: e.target.value })}
          />
          <Input
            id="meta_description"
            label="Meta Description"
            value={form.meta_description}
            onChange={(e) =>
              setForm({ ...form, meta_description: e.target.value })
            }
          />
          <Input
            id="featured_image_url"
            label="Featured Image URL"
            value={form.featured_image_url}
            onChange={(e) =>
              setForm({ ...form, featured_image_url: e.target.value })
            }
          />
          <Textarea
            id="disclosure_text"
            label="Disclosure Text"
            value={form.disclosure_text}
            onChange={(e) =>
              setForm({ ...form, disclosure_text: e.target.value })
            }
            rows={2}
          />
          <Select
            id="status"
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            options={[
              { value: "draft", label: "Draft" },
              { value: "published", label: "Published" },
              { value: "archived", label: "Archived" },
            ]}
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setShowModal(false);
              setEditingPage(null);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {editingPage ? "Update" : "Create"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
