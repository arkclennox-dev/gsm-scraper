import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, ShoppingBag } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createServiceClient();
  const { data: page } = await supabase
    .from("landing_pages")
    .select("meta_title, meta_description, featured_image_url, title")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!page) return { title: "Page Not Found" };

  return {
    title: page.meta_title || page.title,
    description: page.meta_description,
    openGraph: {
      title: page.meta_title || page.title,
      description: page.meta_description || undefined,
      images: page.featured_image_url ? [page.featured_image_url] : undefined,
    },
  };
}

export default async function LandingPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const supabase = await createServiceClient();

  const { data: page } = await supabase
    .from("landing_pages")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!page) notFound();

  const { data: pageProducts } = await supabase
    .from("landing_page_products")
    .select("*, product:affiliate_products(*)")
    .eq("landing_page_id", page.id)
    .order("sort_order");

  const activeProducts = (pageProducts || []).filter(
    (pp: { product: { status: string } | null }) =>
      pp.product && pp.product.status === "active"
  );

  const utmParams = new URLSearchParams();
  if (sp.utm_source) utmParams.set("utm_source", String(sp.utm_source));
  if (sp.utm_medium) utmParams.set("utm_medium", String(sp.utm_medium));
  if (sp.utm_campaign) utmParams.set("utm_campaign", String(sp.utm_campaign));
  if (sp.utm_content) utmParams.set("utm_content", String(sp.utm_content));
  if (sp.utm_term) utmParams.set("utm_term", String(sp.utm_term));
  utmParams.set("lp", slug);

  const disclosure =
    page.disclosure_text ||
    "Beberapa link di halaman ini adalah link affiliate. Saya bisa menerima komisi jika kamu membeli melalui link tersebut, tanpa biaya tambahan untuk kamu.";

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-bold text-[#01083c]">
            {page.title}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {page.featured_image_url && (
          <img
            src={page.featured_image_url}
            alt={page.title}
            className="mb-6 w-full rounded-xl object-cover"
          />
        )}

        <h1 className="text-3xl font-bold text-[#01083c]">{page.title}</h1>

        {page.intro && (
          <p className="mt-3 text-lg text-gray-600 leading-relaxed">
            {page.intro}
          </p>
        )}

        {page.content && (
          <div className="mt-4 text-gray-700 leading-relaxed">
            {page.content}
          </div>
        )}

        <div className="mt-8 space-y-4">
          {activeProducts.map(
            (pp: {
              id: string;
              custom_title: string | null;
              custom_description: string | null;
              custom_cta: string;
              product: {
                slug: string;
                title: string;
                description: string | null;
                image_url: string | null;
              };
            }) => {
              const product = pp.product;
              const ctaUrl = `/go/${product.slug}?${utmParams.toString()}`;

              return (
                <div
                  key={pp.id}
                  className="flex gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={pp.custom_title || product.title}
                      className="h-24 w-24 shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-[#01083c]">
                        {pp.custom_title || product.title}
                      </h3>
                      {(pp.custom_description || product.description) && (
                        <p className="mt-1 text-sm text-gray-500">
                          {pp.custom_description || product.description}
                        </p>
                      )}
                    </div>
                    <a
                      href={ctaUrl}
                      className="mt-3 inline-flex w-fit items-center gap-2 rounded-lg bg-[#01083c] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0a1454]"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      {pp.custom_cta || "Cek di Shopee"}
                    </a>
                  </div>
                </div>
              );
            }
          )}
        </div>

        {activeProducts.length === 0 && (
          <p className="mt-8 text-center text-gray-400">
            Belum ada produk di halaman ini.
          </p>
        )}
      </main>

      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <p className="text-xs text-gray-400 leading-relaxed">{disclosure}</p>
          <div className="mt-3 flex gap-4 text-xs text-gray-400">
            <Link href="/privacy-policy" className="hover:text-gray-600">
              Privacy Policy
            </Link>
            <Link href="/disclaimer" className="hover:text-gray-600">
              Disclaimer
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
