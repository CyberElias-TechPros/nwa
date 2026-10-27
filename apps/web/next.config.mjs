/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    typedRoutes: true,
  },
  async rewrites() {
    const api = process.env.NWA_API_URL ?? 'http://127.0.0.1:8787';
    return [
      { source: '/api/proxy/:path*', destination: `${api}/:path*` },
    ];
  },
};

export default nextConfig;
