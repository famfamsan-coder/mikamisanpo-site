import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "三上うまいもん散歩",
  description: "Mikami's Gourmet Journey — 美食の記録",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-cream-100 overflow-hidden">{children}</body>
    </html>
  );
}
