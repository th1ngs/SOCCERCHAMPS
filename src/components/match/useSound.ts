"use client";

import { useCallback, useState } from "react";
import { Audio } from "@/arcade/audio";

const KEY = "scm.sound";

function readPref(): boolean {
  try {
    return localStorage.getItem(KEY) !== "0";
  } catch {
    return true;
  }
}

/** Preferência de som das partidas (por aparelho). Aplica no Audio do arcade. */
export function useSound(): [boolean, () => void] {
  const [on, setOn] = useState(() => {
    const v = readPref();
    Audio.setEnabled(v);
    return v;
  });
  const toggle = useCallback(() => {
    setOn((v) => {
      const next = !v;
      Audio.setEnabled(next);
      Audio.init();
      try {
        localStorage.setItem(KEY, next ? "1" : "0");
      } catch {
        /* sem armazenamento */
      }
      return next;
    });
  }, []);
  return [on, toggle];
}
