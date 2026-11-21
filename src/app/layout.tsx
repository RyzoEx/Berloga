import type { Metadata } from "next";
import { DesktopFrame } from "@/components/DesktopFrame";
import "./globals.css";
import "./modern.css";
import "./desktop.css";

export const metadata: Metadata = {
  title: "Berloga",
  description: "Закрытый голосовой клиент",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body><DesktopFrame>{children}</DesktopFrame></body>
    </html>
  );
}
