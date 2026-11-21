import type { Metadata } from "next";
import "./globals.css";
import "./modern.css";

export const metadata: Metadata = {
  title: "Berloga",
  description: "Закрытый голосовой клиент",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
