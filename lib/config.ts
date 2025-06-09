/**
 * Deployment configuration utility
 * Handles different deployment scenarios (localhost, GitHub Pages, Cloudflare Workers, etc.)
 */

export const getBasePath = (): string => {
  // Environment variables take precedence
  if (process.env.BASE_PATH) {
    return process.env.BASE_PATH
  }
  
  // Default production path for GitHub Pages deployment
  if (process.env.NODE_ENV === 'production') {
    return '/outperforming-the-index'
  }
  
  // Development
  return ''
}

export const getAssetPrefix = (): string => {
  // Environment variables take precedence
  if (process.env.ASSET_PREFIX) {
    return process.env.ASSET_PREFIX
  }
  
  // Use same as base path by default
  return getBasePath()
}

export const getDataPath = (filename: string): string => {
  const basePath = getBasePath()
  return `${basePath}/data/${filename}`
}

export const getAssetPath = (assetPath: string): string => {
  const basePath = getBasePath()
  return `${basePath}${assetPath.startsWith('/') ? '' : '/'}${assetPath}`
} 