"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FileText,
  MousePointerClick,
  DollarSign,
  BarChart3,
  Settings,
  Link2,
  Key,
  BookOpen,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/landing-pages", label: "Landing Pages", icon: FileText },
  { href: "/admin/clicks", label: "Clicks", icon: MousePointerClick },
  { href: "/admin/ad-spend", label: "Ad Spend", icon: DollarSign },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/redirects", label: "Redirect Builder", icon: Link2, dividerBefore: true },
  { href: "/admin/api-keys", label: "API Keys", icon: Key },
  { href: "/admin/api-docs", label: "API Docs", icon: BookOpen },
  { href: "/admin/settings", label: "Settings", icon: Settings, dividerBefore: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-full w-[220px] flex-col border-r border-[#1e2433] bg-[#0b0f1a]">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <MousePointerClick className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-gray-100">Affiliate Dashboard</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <div key={item.href}>
              {item.dividerBefore && (
                <div className="mx-2 my-2 border-t border-[#1e2433]" />
              )}
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-600/20 text-blue-400"
                    : "text-gray-400 hover:bg-[#151b2b] hover:text-gray-200"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            </div>
          );
        })}
      </nav>

      <div className="relative border-t border-[#1e2433] p-3">
        <button
          onClick={() => setShowAccountMenu(!showAccountMenu)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-[#151b2b] hover:text-gray-200"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
            AD
          </div>
          <span className="flex-1 text-left text-xs">Admin</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        {showAccountMenu && (
          <div className="absolute bottom-full left-3 right-3 mb-1 rounded-lg border border-[#1e2433] bg-[#111827] py-1 shadow-xl">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:bg-[#151b2b] hover:text-gray-200"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
