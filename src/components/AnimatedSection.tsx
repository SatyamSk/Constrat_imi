import { useRef, useEffect, useState, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  delay?: number;
  variant?: "fade-up" | "fade-in" | "scale" | "slide-left" | "slide-right" | "blur";
  className?: string;
}

export function AnimatedSection({
  children,
  delay = 0,
  variant = "fade-up",
  className = "",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const baseStyle: React.CSSProperties = {
    transitionProperty: "opacity, transform, filter",
    transitionDuration: "0.8s",
    transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
    transitionDelay: `${delay}ms`,
  };

  const variants: Record<string, { hidden: React.CSSProperties; visible: React.CSSProperties }> = {
    "fade-up": {
      hidden: { opacity: 0, transform: "translateY(40px)" },
      visible: { opacity: 1, transform: "translateY(0)" },
    },
    "fade-in": {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
    },
    scale: {
      hidden: { opacity: 0, transform: "scale(0.92)" },
      visible: { opacity: 1, transform: "scale(1)" },
    },
    "slide-left": {
      hidden: { opacity: 0, transform: "translateX(-60px)" },
      visible: { opacity: 1, transform: "translateX(0)" },
    },
    "slide-right": {
      hidden: { opacity: 0, transform: "translateX(60px)" },
      visible: { opacity: 1, transform: "translateX(0)" },
    },
    blur: {
      hidden: { opacity: 0, filter: "blur(12px)", transform: "translateY(20px)" },
      visible: { opacity: 1, filter: "blur(0px)", transform: "translateY(0)" },
    },
  };

  const v = variants[variant] || variants["fade-up"];

  return (
    <div
      ref={ref}
      className={className}
      style={{ ...baseStyle, ...(visible ? v.visible : v.hidden) }}
    >
      {children}
    </div>
  );
}

/* Parallax background component */
export function ParallaxBg({
  src,
  speed = 0.3,
  opacity = 0.08,
  className = "",
}: {
  src: string;
  speed?: number;
  opacity?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function onScroll() {
      const rect = el!.getBoundingClientRect();
      const offset = rect.top * speed;
      el!.style.transform = `translateY(${offset}px)`;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [speed]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <div ref={ref} className="absolute inset-[-20%] w-[140%] h-[140%]">
        <img src={src} alt="" className="w-full h-full object-cover" style={{ opacity }} />
      </div>
    </div>
  );
}

/* Staggered text reveal */
export function TextReveal({
  text,
  className = "",
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((word, i) => (
        <AnimatedSection
          key={i}
          variant="blur"
          delay={delay + i * 60}
          className="inline-block mr-[0.3em]"
        >
          {word}
        </AnimatedSection>
      ))}
    </span>
  );
}

/* Smooth counter */
export function SmoothCounter({
  target,
  suffix = "",
  duration = 2000,
}: {
  target: number;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [val, setVal] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const start = performance.now();
    function tick(now: number) {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      setVal(Math.round(ease * target));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [visible, target, duration]);

  return (
    <span ref={ref}>
      {val.toLocaleString()}
      {suffix}
    </span>
  );
}
