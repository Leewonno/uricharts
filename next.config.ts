import type { NextConfig } from "next";

// GitHub Pages 프로젝트 페이지(https://<user>.github.io/<repo>)는 하위 경로에서 서빙되므로
// 배포 워크플로우에서 BASE_PATH=/<repo> 를 주입한다. 로컬/커스텀 도메인에서는 비워둔다.
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  images: {
    // 정적 export에서는 기본 이미지 최적화 서버를 쓸 수 없다.
    unoptimized: true,
  },
  // cacheComponents / partialPrefetching(PPR)은 서버 런타임이 필요해 export 모드와 함께 쓸 수 없다.
  reactCompiler: true,
};

export default nextConfig;
