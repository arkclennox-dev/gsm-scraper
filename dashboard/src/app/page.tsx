import Link from "next/link";
import { MousePointerClick, BarChart3, Link2, Shield } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#01083c]">
              <MousePointerClick className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-[#01083c]">
              Affiliate Click Dashboard
            </span>
          </div>
          <Link
            href="/admin/login"
            className="rounded-lg bg-[#01083c] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0a1454]"
          >
            Admin Login
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-[#01083c] sm:text-5xl">
            Track Every Affiliate Click
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
            Manage redirect links, track clicks, input ad spend, and calculate
            the real cost per click for your affiliate campaigns.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/admin/login"
              className="rounded-lg bg-[#01083c] px-6 py-3 font-medium text-white transition-colors hover:bg-[#0a1454]"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Link2,
              title: "Redirect Links",
              desc: "Create tracked redirect URLs with UTM parameters for every affiliate product.",
            },
            {
              icon: MousePointerClick,
              title: "Click Tracking",
              desc: "Log every click with device, browser, UTM data, and duplicate detection.",
            },
            {
              icon: BarChart3,
              title: "Cost Analysis",
              desc: "Compare Meta Ads spend with internal redirect clicks to find your true CPC.",
            },
            {
              icon: Shield,
              title: "Bot Detection",
              desc: "Automatically flag bot clicks and duplicates to ensure clean analytics.",
            },
          ].map((feature) => (
            <div key={feature.title} className="rounded-xl border border-gray-100 p-6">
              <feature.icon className="h-8 w-8 text-[#01083c]" />
              <h3 className="mt-3 font-semibold text-[#01083c]">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-gray-500">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6 text-xs text-gray-400">
          <span>&copy; {new Date().getFullYear()} Affiliate Click Dashboard</span>
          <div className="flex gap-4">
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
