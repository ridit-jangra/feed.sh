import { useEffect } from "react";
import { useStdin, useStdout } from "ink";

export function useMouseWheel(onWheel: (direction: "up" | "down") => void) {
  const { stdin, setRawMode, isRawModeSupported } = useStdin();
  const { stdout } = useStdout();

  useEffect(() => {
    if (!isRawModeSupported) return;

    setRawMode(true);

    stdout.write("\x1b[?1000h\x1b[?1006h");

    const handler = (data: Buffer) => {
      const seq = data.toString();

      const match = seq.match(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/);
      if (!match) return;
      const btn = parseInt(match[1]!, 10);

      if (btn === 64) onWheel("up");
      else if (btn === 65) onWheel("down");
    };

    stdin.on("data", handler);

    return () => {
      stdout.write("\x1b[?1000l\x1b[?1006l");
      stdin.off("data", handler);
    };
  }, [stdin, stdout, setRawMode, isRawModeSupported, onWheel]);
}
