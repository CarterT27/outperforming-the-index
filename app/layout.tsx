import type { Metadata } from 'next'
import './globals.css'
import { getAssetPath } from '@/lib/config'

const faviconPath = getAssetPath('/favicon.ico')

export const metadata: Metadata = {
  title: 'Outperforming the Index',
  description: 'Analyzing S&P 500 stocks performance and identifying opportunities to outperform the index',
  generator: 'v0.dev',
  icons: {
    icon: [
      { url: faviconPath, sizes: 'any' },
      { url: faviconPath, type: 'image/x-icon' },
    ],
    shortcut: faviconPath,
    apple: faviconPath,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href={faviconPath} sizes="any" />
        <link rel="shortcut icon" href={faviconPath} />
      </head>
      <body>{children}</body>
    </html>
  )
}
