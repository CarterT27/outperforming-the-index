import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Outperforming the Index',
  description: 'Analyzing S&P 500 stocks performance and identifying opportunities to outperform the index',
  generator: 'v0.dev',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
