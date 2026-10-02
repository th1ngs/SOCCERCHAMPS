// Utilitários de textura dos lances 3D (canvas → textura three.js).
import * as THREE from "three";

/** Anisotropia usada nas texturas (o máximo da placa, definido ao criar a cena). */
let ANISO = 8;
export const setAniso = (n: number): void => { ANISO = n; };

export const hash = (s: string): number => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 9) >>> 0;

export const luminance = (hex: string): number => {
  const c = new THREE.Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
};

export function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, srgb = true): THREE.CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const c = cv.getContext("2d") as CanvasRenderingContext2D;
  draw(c);
  const t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = ANISO;
  return t;
}
