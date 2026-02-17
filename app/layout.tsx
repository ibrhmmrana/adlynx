import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AdLynx — From URL to ads in minutes",
  description:
    "Paste your website URL and AdLynx extracts your full brand profile — colors, logos, voice, content structure — ready to launch performance campaigns.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable}`}>
      <body className="antialiased font-sans min-h-screen bg-[#fafafa]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
