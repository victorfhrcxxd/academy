import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Upload da logo do cabeçalho de email pelo admin — o padrão de 1MB é curto.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
