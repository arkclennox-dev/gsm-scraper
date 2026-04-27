import { cn } from "@/lib/utils";

type BadgeVariant = "active" | "paused" | "inactive" | "draft" | "published" | "archived" | "default";

const variantStyles: Record<BadgeVariant, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  published: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  paused: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  draft: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  inactive: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  archived: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  default: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

export function Badge({
  variant = "default",
  children,
  className,
}: {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
