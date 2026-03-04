"use client";

import { useRef, useState, useEffect } from "react";

export function usePathLength<T extends SVGGeometryElement>(): {
  ref: React.RefObject<T | null>;
  length: number;
} {
  const ref = useRef<T | null>(null);
  const [length, setLength] = useState(0);

  useEffect(() => {
    if (ref.current) {
      setLength(ref.current.getTotalLength());
    }
  }, []);

  return { ref, length };
}
