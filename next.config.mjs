/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    localPatterns: [{ pathname: "/api/places/photo" }],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["*.devtunnels.ms"],
    },
  },
};

export default nextConfig;
