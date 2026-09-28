"use client";

import { useEffect, useState } from "react";

/** Valor atrasado em `ms` (para busca por texto sem recalcular a cada tecla). */
export function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
