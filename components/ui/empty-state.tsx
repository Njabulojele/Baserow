import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-[#1a252f] border border-[#2f3e46] flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-[#a9927d]" />
      </div>
      <h3 className="text-sm font-mono uppercase tracking-widest text-white mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-xs font-mono text-muted-foreground/60 max-w-sm">
          {description}
        </p>
      )}
    </div>
  );
}
