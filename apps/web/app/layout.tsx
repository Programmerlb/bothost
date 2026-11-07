import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bothost — Telegram bot hosting",
  description: "Manage your Python Telegram bots in one place."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
