"use client";

import { Bell, RefreshCw, Download, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onExport?: () => void;
  onRefresh?: () => void;
}

export function Header({ title, subtitle, actions, onExport, onRefresh }: HeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-[#1e2433] bg-[#0b0f1a] px-6 py-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-100">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {onRefresh && (
          <Button variant="ghost" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
        {onExport && (
          <Button variant="secondary" size="sm" onClick={onExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        )}
        <button className="relative rounded-lg p-2 text-gray-400 hover:bg-[#151b2b] hover:text-gray-200">
          <HelpCircle className="h-4 w-4" />
        </button>
        <button className="relative rounded-lg p-2 text-gray-400 hover:bg-[#151b2b] hover:text-gray-200">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-blue-500" />
        </button>
      </div>
    </div>
  );
}
