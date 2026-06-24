import type { Metadata } from "next";
import "./globals.css";
import { BrandBar } from "@/components/layout/brand-bar";
import { ToastProvider } from "@/components/ui/toast";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata: Metadata = {
  title: "EndoLab",
  description: "Clinical case intelligence for complex endometriosis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          <BrandBar />
          {children}
          <SiteFooter />
        </ToastProvider>
      </body>
    </html>
  );
}
