import { useState, useEffect } from "react";

const HINTS = ["feed", "journal new", "project pixl", "search meridia"];

export function useRotatingPlaceholder(
  active: boolean,
  intervalMs = 3000,
): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % HINTS.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [active, intervalMs]);

  return `try: ${HINTS[index]}`;
}
