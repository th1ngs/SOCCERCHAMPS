"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { ArcadeRunner } from "@/arcade/runner";
import { cn } from "@/lib/cn";

/** Palco do futebol de botão: canvas que se ajusta ao espaço e liga o laço do runner. */
export function ButtonStage({ runner, className, children }: { runner: ArcadeRunner; className?: string; children?: ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const stage = stageRef.current, canvas = canvasRef.current;
    if (!stage || !canvas) return;
    return runner.attach(canvas, stage);
  }, [runner]);

  return (
    <div ref={stageRef} className={cn("relative flex min-h-0 flex-1 items-center justify-center p-2", className)}>
      <canvas
        ref={canvasRef}
        className="block touch-none select-none rounded-[14px] shadow-[0_20px_60px_rgba(0,0,0,.5),0_0_0_3px_rgba(255,255,255,.06)]"
        aria-label="Campo de futebol de botão"
      />
      {children}
    </div>
  );
}
