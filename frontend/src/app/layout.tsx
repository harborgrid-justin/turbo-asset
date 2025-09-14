import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "../components/ui/Header";
import { NotificationProvider } from "../components/ui/NotificationSystem";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Turbo Asset - Enterprise IWMS Platform",
  description: "Professional Enterprise Integrated Workplace Management System - Modern Alternative to IBM Tririga",
  keywords: ["IWMS", "Enterprise", "Facilities Management", "Real Estate", "Asset Management"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        <NotificationProvider>
          <Header />
          <main className="min-h-screen">
            {children}
          </main>
        </NotificationProvider>
      </body>
    </html>
  );
}
