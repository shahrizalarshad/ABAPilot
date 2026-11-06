import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ABAPilot — AI assistant for SAP ABAP support tickets",
  description:
    "Paste a support ticket and get the analysis, ABAP code in your team's format, test cases and change log in minutes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
