import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "전생 알아보기",
  description: "이름을 입력하면 AI가 당신의 전생 이야기를 들려드립니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
