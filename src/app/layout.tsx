import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chess Progress Academy",
  description: "Онлайн-платформа для шахматных курсов",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="min-h-full bg-white text-slate-900">
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
// force rebuild
