import type { Metadata } from "next";
import "./globals.css";
import { LocaleProvider } from "./locale";
import "./brand.css";
import "./accounts.css";
import "./records.css";

export const metadata: Metadata = {
  title: "Optika Nimani | Menaxhimi i klientëve",
  description:
    "Regjistri i klientëve, historiku i recetave dhe blerjeve për Optika Nimani.",
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
    <html lang="sq">
      <body className="antialiased">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
