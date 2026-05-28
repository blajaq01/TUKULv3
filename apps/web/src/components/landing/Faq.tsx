"use client";

import { useMemo, useState } from "react";

type FaqItem = {
  question: string;
  answer: string;
};

export function Faq({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const rendered = useMemo(
    () =>
      items.map((item, idx) => {
        const open = openIndex === idx;
        return (
          <div
            key={item.question}
            className="rounded-3xl border border-[var(--tukul-border)] bg-[var(--tukul-surface)]"
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
              aria-expanded={open}
              onClick={() => setOpenIndex((v) => (v === idx ? null : idx))}
            >
              <div className="text-base font-semibold text-[var(--foreground)]">
                {item.question}
              </div>
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--tukul-border)] transition-transform duration-200 ease-out ${
                  open ? "rotate-45" : ""
                }`}
                aria-hidden="true"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-[var(--tukul-muted)]"
                >
                  <path
                    d="M8 3.2V12.8M3.2 8H12.8"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </button>

            <div
              className="grid transition-[grid-template-rows] duration-300 ease-out"
              style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden px-6 pb-6 text-[15px] leading-7 text-[var(--tukul-muted)]">
                {item.answer}
              </div>
            </div>
          </div>
        );
      }),
    [items, openIndex],
  );

  return <div className="grid gap-4">{rendered}</div>;
}
