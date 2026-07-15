import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "전생에 개발자였다면",
  description:
    "이름을 입력하면 전생에 어떤 개발자였는지, 무엇을 만들다 어떻게 최후를 맞았는지 알려드립니다.",
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
