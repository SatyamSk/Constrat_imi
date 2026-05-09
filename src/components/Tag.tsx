import { ReactNode } from "react";

type Variant = "competition" | "internship" | "workshop" | "urgent" | "neutral";

const map: Record<Variant, string> = {
  competition: "bg-tag-comp-bg text-tag-comp-text",
  internship: "bg-tag-intern-bg text-tag-intern-text",
  workshop: "bg-tag-work-bg text-tag-work-text",
  urgent: "bg-tag-urgent-bg text-tag-urgent-text",
  neutral: "bg-muted text-text-secondary",
};

export function Tag({ children, variant = "competition" }: { children: ReactNode; variant?: Variant }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] uppercase tracking-[0.06em] font-medium ${map[variant]}`}>
      {children}
    </span>
  );
}
