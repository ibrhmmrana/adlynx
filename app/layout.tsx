import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AdLynx — URL to ads in 2 minutes",
  description:
    "Performance media powered by hybrid intelligence. Scan your website, get your brand profile, and go from URL to ads.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans min-h-screen">
        {children}
      </body>
    </html>
  );
}
