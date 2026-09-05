import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vantiq — Your money, read clearly",
  description:
    "Track your spending and watch the market in one place. Vantiq turns your finances and the day's market moves into a five-minute read.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
