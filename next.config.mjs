/** @type {import('next').NextConfig} */
const nextConfig = {
  // El indicador de Next (solo en desarrollo) tapaba la foto y el nombre del
  // usuario abajo a la izquierda del menu: se lo pasa a la derecha.
  devIndicators: { position: "bottom-right" },
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
