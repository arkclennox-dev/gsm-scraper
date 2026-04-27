import Link from "next/link";

export const metadata = {
  title: "Privacy Policy - Affiliate Click Dashboard",
};

export default function PrivacyPolicyPage() {
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
        <h1 className="text-3xl font-bold text-[#01083c]">Privacy Policy</h1>
        <div className="mt-6 space-y-4 text-gray-600 leading-relaxed">
          <p>
            This Privacy Policy describes how we collect and use information
            when you visit our website or use our landing pages.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 pt-4">
            Information We Collect
          </h2>
          <p>
            When you click on affiliate links, we may collect: your device type,
            browser, operating system, referring URL, and an anonymized hash of
            your IP address. We do not store your raw IP address.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 pt-4">
            How We Use Information
          </h2>
          <p>
            We use this information to track click performance, detect duplicate
            or bot clicks, and measure advertising effectiveness. We do not sell
            or share your personal information with third parties.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 pt-4">
            Cookies and Tracking
          </h2>
          <p>
            We may use cookies and tracking pixels (such as Meta Pixel and
            Google Analytics) to measure page visits and ad performance. You can
            control cookie preferences in your browser settings.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 pt-4">
            Affiliate Links
          </h2>
          <p>
            Some links on our pages are affiliate links. When you click these
            links and make a purchase, we may receive a commission at no
            additional cost to you.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 pt-4">Contact</h2>
          <p>
            If you have questions about this privacy policy, please contact us
            through the information provided on our website.
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
