/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Use environment variable for flexible deployment
  assetPrefix: process.env.ASSET_PREFIX || (process.env.NODE_ENV === 'production' ? '/outperforming-the-index' : ''),
  basePath: process.env.BASE_PATH || (process.env.NODE_ENV === 'production' ? '/outperforming-the-index' : ''),
  // Ensure proper static file handling for Cloudflare Workers
  generateBuildId: async () => {
    return 'build'
  },
}

export default nextConfig
