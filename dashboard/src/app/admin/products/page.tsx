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
import type { AffiliateProduct } from "@/lib/types";
import { Plus, Copy, Pencil, Trash2, Copy as CopyIcon } from "lucide-react";

export default function ProductsPage() {
  const [products, setProducts] = useState<AffiliateProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AffiliateProduct | null>(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    image_url: "",
    destination_url: "",
    category: "",
    source_platform: "shopee",
    status: "active",
    notes: "",
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("affiliate_products")
      .select("*")
      .order("created_at", { ascending: false });
    setProducts((data || []) as AffiliateProduct[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSave = async () => {
    if (!form.title || !form.slug || !form.destination_url) {
      toast("error", "Title, slug, and destination URL are required");
      return;
    }

    const supabase = createClient();

    if (editingProduct) {
      const { error } = await supabase
        .from("affiliate_products")
        .update({
          ...form,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingProduct.id);
      if (error) {
        toast("error", error.message);
        return;
      }
      toast("success", "Product updated");
    } else {
      const { error } = await supabase.from("affiliate_products").insert(form);
      if (error) {
        toast("error", error.message);
        return;
      }
      toast("success", "Product created");
    }

    setShowModal(false);
    setEditingProduct(null);
    resetForm();
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    await supabase
      .from("affiliate_products")
      .update({ status: "inactive" })
      .eq("id", id);
    toast("success", "Product deactivated");
    fetchProducts();
  };

  const handleDuplicate = async (product: AffiliateProduct) => {
    const supabase = createClient();
    await supabase.from("affiliate_products").insert({
      title: `${product.title} Copy`,
      slug: `${product.slug}-copy`,
      description: product.description,
      image_url: product.image_url,
      destination_url: product.destination_url,
      category: product.category,
      source_platform: product.source_platform,
      status: "active",
      notes: product.notes,
    });
    toast("success", "Product duplicated");
    fetchProducts();
  };

  const copyRedirectUrl = (slug: string) => {
    const url = `${window.location.origin}/go/${slug}`;
    navigator.clipboard.writeText(url);
    toast("success", "Redirect URL copied");
  };

  const resetForm = () => {
    setForm({
      title: "",
      slug: "",
      description: "",
      image_url: "",
      destination_url: "",
      category: "",
      source_platform: "shopee",
      status: "active",
      notes: "",
    });
  };

  const openEdit = (product: AffiliateProduct) => {
    setEditingProduct(product);
    setForm({
      title: product.title,
      slug: product.slug,
      description: product.description || "",
      image_url: product.image_url || "",
      destination_url: product.destination_url,
      category: product.category || "",
      source_platform: product.source_platform,
      status: product.status,
      notes: product.notes || "",
    });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingProduct(null);
    resetForm();
    setShowModal(true);
  };

  const filtered = products.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Header
        title="Products"
        subtitle="Manage affiliate products and redirect links"
        onRefresh={fetchProducts}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        }
      />

      <div className="p-6 space-y-4">
        <Input
          placeholder="Search products..."
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
                <TableHead>Platform</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell className="text-center py-8 text-gray-500" colSpan={6}>
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center py-8 text-gray-500" colSpan={6}>
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium text-gray-200">
                      {product.title}
                    </TableCell>
                    <TableCell className="text-xs text-gray-400">
                      /go/{product.slug}
                    </TableCell>
                    <TableCell>{product.source_platform}</TableCell>
                    <TableCell>
                      <Badge variant={product.status as "active" | "inactive"}>
                        {product.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(product.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyRedirectUrl(product.slug)}
                          className="rounded p-1.5 text-gray-400 hover:bg-[#1a1f2e] hover:text-gray-200"
                          title="Copy redirect URL"
                        >
                          <CopyIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(product)}
                          className="rounded p-1.5 text-gray-400 hover:bg-[#1a1f2e] hover:text-gray-200"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(product)}
                          className="rounded p-1.5 text-gray-400 hover:bg-[#1a1f2e] hover:text-gray-200"
                          title="Duplicate"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="rounded p-1.5 text-gray-400 hover:bg-[#1a1f2e] hover:text-red-400"
                          title="Deactivate"
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
          setEditingProduct(null);
          resetForm();
        }}
        title={editingProduct ? "Edit Product" : "Create Product"}
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
                slug: editingProduct ? form.slug : slugify(e.target.value),
              });
            }}
            placeholder="Product name"
          />
          <Input
            id="slug"
            label="Slug *"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="product-slug"
          />
          <Textarea
            id="description"
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
          />
          <Input
            id="image_url"
            label="Image URL"
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            placeholder="https://..."
          />
          <Input
            id="destination_url"
            label="Destination Affiliate URL *"
            value={form.destination_url}
            onChange={(e) =>
              setForm({ ...form, destination_url: e.target.value })
            }
            placeholder="https://s.shopee.co.id/xxxxx"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="category"
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <Select
              id="source_platform"
              label="Source Platform"
              value={form.source_platform}
              onChange={(e) =>
                setForm({ ...form, source_platform: e.target.value })
              }
              options={[
                { value: "shopee", label: "Shopee" },
                { value: "tokopedia", label: "Tokopedia" },
                { value: "lazada", label: "Lazada" },
                { value: "other", label: "Other" },
              ]}
            />
          </div>
          <Select
            id="status"
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
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
              setEditingProduct(null);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {editingProduct ? "Update" : "Create"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
