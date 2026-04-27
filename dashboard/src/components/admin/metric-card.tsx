import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Info } from "lucide-react";
import { Card } from "@/components/ui/card";

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  comparisonLabel?: string;
  icon?: React.ReactNode;
  chart?: React.ReactNode;
}

export function MetricCard({
  title,
  value,
  change,
  comparisonLabel,
  icon,
  chart,
}: MetricCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <Card>
      <div className="flex items-center gap-1.5 text-gray-400">
        <span className="text-sm font-medium">{title}</span>
        <Info className="h-3.5 w-3.5 text-gray-600" />
      </div>
      <div className="mt-2 flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-gray-100">{value}</div>
          {change !== undefined && (
            <div className="mt-1 flex items-center gap-1">
              {isPositive ? (
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-red-400" />
              )}
              <span
                className={cn(
                  "text-xs font-medium",
                  isPositive ? "text-emerald-400" : "text-red-400"
                )}
              >
                {isPositive ? "+" : ""}
                {change.toFixed(1)}%
              </span>
              {comparisonLabel && (
                <span className="text-xs text-gray-500">{comparisonLabel}</span>
              )}
            </div>
          )}
        </div>
        {icon && <div className="text-gray-600">{icon}</div>}
        {chart && <div className="h-12 w-24">{chart}</div>}
      </div>
    </Card>
  );
}
