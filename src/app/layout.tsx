import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const body = Barlow({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const head = Barlow_Condensed({
  variable: "--font-head",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Soccer Champs Manager",
  description: "Comande um clube brasileiro: temporadas, categorias de base, mercado e partidas ao vivo.",
};

export const viewport: Viewport = {
  themeColor: "#07121f",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${body.variable} ${head.variable} h-full antialiased`}>
      <body className="min-h-full font-sans text-base leading-relaxed">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
