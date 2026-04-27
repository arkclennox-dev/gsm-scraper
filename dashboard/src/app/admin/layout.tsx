"use client";

import { Sidebar } from "@/components/admin/sidebar";
import { ToastProvider } from "@/components/ui/toast";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-[220px] flex-1 overflow-x-hidden">{children}</main>
      </div>
    </ToastProvider>
  );
}
