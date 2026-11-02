import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  async redirects() {
    return [
      // The event-based booking model replaced the old enquiry/registration routes.
      { source: "/events", destination: "/trips", permanent: true },
      { source: "/events/:slug", destination: "/trips/:slug", permanent: true },
      { source: "/dashboard", destination: "/customer/dashboard", permanent: true },
      { source: "/gallery", destination: "/customer/gallery", permanent: true },
      { source: "/plan", destination: "/trips", permanent: true },
    ];
  },
};

export default nextConfig;
