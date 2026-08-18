import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atmos — weather, with room to breathe",
  description: "A thoughtful, live weather dashboard powered by Open-Meteo.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
