"use client";

import { useLayoutEffect, useRef } from "react";
import { BlockMotion } from "./block-motion";

export function useBlockMotion() {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!root.current || !("IntersectionObserver" in window)) return;
    const motion = new BlockMotion(root.current);
    motion.start();
    return () => motion.stop();
  }, []);
  return root;
}
