import type { Metadata } from "next";
import { Cairo, Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { LocaleProvider } from "@/lib/i18n";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
});

export const metadata: Metadata = {
  title: "ShipTrack MVP",
  description: "Premium shipment management, tracking, and fulfillment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} ${cairo.variable} antialiased`}>
        <LocaleProvider>
          <div className="min-h-screen flex flex-col bg-[#111827] text-white">
            <Navigation />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </LocaleProvider>
      </body>
    </html>
  );
}
