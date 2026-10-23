import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "php2shell Security Dashboard",
  description: "Severity overview of php2shell-scanner results",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 antialiased">{children}</body>
    </html>
  );
}
