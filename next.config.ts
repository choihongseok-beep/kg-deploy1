import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 서버리스 배포 시 API 라우트 번들에 전생 기록 엑셀 파일을 포함시킨다.
  outputFileTracingIncludes: {
    "/api/past-life": ["./data/dev-past-lives.xlsx"],
  },
};

export default nextConfig;
