import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bite Routine | Yemek kataloğu",
  description: "Türkiye için kaynaklı temel gıda kataloğu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
