import { Link } from "@tanstack/react-router";

interface Props {
  used: number;
  limit: number;
  tier: string;
  /** What ran out — controls the headline + bullet list. */
  kind: "gd_brief" | "photo_analysis";
  onClose: () => void;
}

export function PaywallModal({ used, limit, tier, kind, onClose }: Props) {
  const isBrief = kind === "gd_brief";
  return (
    <div
      className="fixed inset-0 bg-black/55 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[16px] max-w-[440px] w-full p-7 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-[20px] text-text-muted hover:text-text-primary leading-none"
          aria-label="Close"
        >
          ×
        </button>

        <div className="w-12 h-12 rounded-full bg-orange/10 flex items-center justify-center mb-5">
          <svg className="w-6 h-6 text-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>

        <h2 className="font-serif text-[24px] leading-[1.2]">
          {isBrief
            ? "You're out of GD briefs for today"
            : "You're out of photo analyses for today"}
        </h2>
        <p className="mt-3 text-[14px] text-text-secondary leading-[1.6]">
          You've used <strong>{used}</strong> of <strong>{limit}</strong>{" "}
          {isBrief ? "GD briefs" : "photo case analyses"} in the last 24 hours on the{" "}
          {tier === "pro" ? "Pro" : "free"} plan.
          {!isBrief && (
            <span> Text-based case analyses are still unlimited.</span>
          )}
        </p>

        <div className="mt-5 p-4 rounded-[10px] bg-orange/5 border border-orange/20">
          <p className="text-[13px] font-semibold text-orange">Upgrade to Pro</p>
          <ul className="mt-2 space-y-1 text-[12px] text-text-secondary">
            <li>• 25 GD briefs per day</li>
            <li>• Unlimited photo case analyses</li>
            <li>• ₹99/month — cancel anytime</li>
          </ul>
        </div>

        <div className="mt-6 flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">
            Maybe later
          </button>
          <Link to="/payment" className="btn-primary flex-1 text-center">
            Upgrade
          </Link>
        </div>
      </div>
    </div>
  );
}
