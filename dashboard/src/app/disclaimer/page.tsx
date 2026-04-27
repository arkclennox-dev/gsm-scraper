import Link from "next/link";

export const metadata = {
  title: "Disclaimer - Affiliate Click Dashboard",
};

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="font-semibold text-[#01083c]">
            Affiliate Click Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold text-[#01083c]">Disclaimer</h1>
        <div className="mt-6 space-y-4 text-gray-600 leading-relaxed">
          <h2 className="text-xl font-semibold text-gray-900 pt-4">
            Affiliate Disclosure
          </h2>
          <p>
            Beberapa link di situs ini adalah link affiliate. Artinya, jika kamu
            membeli produk melalui link tersebut, kami dapat menerima komisi
            tanpa biaya tambahan untuk kamu. Kami hanya merekomendasikan produk
            yang kami percaya relevan dan bermanfaat.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 pt-4">
            Accuracy
          </h2>
          <p>
            Informasi yang ditampilkan di situs ini diberikan &ldquo;apa
            adanya&rdquo; tanpa jaminan apa pun. Harga, ketersediaan, dan detail
            produk dapat berubah sewaktu-waktu tanpa pemberitahuan.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 pt-4">
            External Links
          </h2>
          <p>
            Situs ini berisi link ke situs pihak ketiga. Kami tidak bertanggung
            jawab atas konten atau praktik privasi situs-situs tersebut.
          </p>
        </div>
      </main>

      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-6 text-xs text-gray-400">
          <Link href="/" className="hover:text-gray-600">
            &larr; Back to Home
          </Link>
        </div>
      </footer>
    </div>
  );
}
