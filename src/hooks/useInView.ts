"use client";

import { useRef, useState, useEffect } from "react";

function getScrollParent(el: Element): Element | null {
  let parent = el.parentElement;
  while (parent) {
    const style = getComputedStyle(parent);
    if (/(auto|scroll)/.test(style.overflow + style.overflowY + style.overflowX)) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

export function useInView<T extends Element = HTMLDivElement>(options?: { threshold?: number }): {
  ref: React.RefObject<T | null>;
  inView: boolean;
} {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const scrollParent = getScrollParent(el);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: options?.threshold ?? 0.15, root: scrollParent }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [options?.threshold]);

  return { ref, inView };
}
