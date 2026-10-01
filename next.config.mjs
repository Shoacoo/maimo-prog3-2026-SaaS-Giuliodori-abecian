/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    localPatterns: [{ pathname: "/api/places/photo" }, { pathname: "/logo-mark.png" }],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["*.devtunnels.ms"],
    },
  },
};

export default nextConfig;
