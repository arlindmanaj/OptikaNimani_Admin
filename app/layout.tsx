import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nimani | Customer Studio",
  description:
    "Customer care, prescription history and family records for Optika Nimani.",
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
