"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export function Reveal({
  children,
  className,
  delayMs = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const id = useId();
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [id]);

  const style = useMemo<React.CSSProperties>(
    () => ({
      transitionDelay: `${delayMs}ms`,
    }),
    [delayMs],
  );

  return (
    <div
      ref={ref}
      style={style}
      className={[
        "transition-all duration-300 ease-out will-change-transform",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

