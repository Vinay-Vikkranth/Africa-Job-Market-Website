import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit", "@prisma/client", "better-sqlite3"],
};

export default nextConfig;
