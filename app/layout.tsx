import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SGDSMasthead } from "@/components/sgds-masthead";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "HR Portal - Public Service Division",
  description: "HR Portal for Singapore Public Service - Manage circulars, resources, and HR information",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <SGDSMasthead />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
