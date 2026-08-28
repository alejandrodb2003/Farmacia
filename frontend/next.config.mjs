/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://farmacia.adbtech.com.ar/api/:path*'
      },
      {
        source: '/socket.io/:path*',
        destination: 'https://farmacia.adbtech.com.ar/socket.io/:path*'
      }
    ]
  }
};

export default nextConfig;
