/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "http",
        hostname: "images.milyi-dom.local",
      },
      {
        protocol: "https", 
        hostname: "images.milyi-dom.local",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8080",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "4001",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "4001",
      },
    ],
    unoptimized: true,
  },
};

export default nextConfig;

