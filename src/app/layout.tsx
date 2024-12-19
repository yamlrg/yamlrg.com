import "./globals.css";
import { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'yamlrg?',
  description: 'Yet Another Machine Learning Reading Group',
  openGraph: {
    title: 'yamlrg?',
    description: 'Yet Another Machine Learning Reading Group',
    images: [
      {
        url: '/yamlrg.webp',
        width: 1200,
        height: 630,
        alt: 'YAMLRG Logo',
      },
    ],
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/yamlrg.png',
    apple: '/yamlrg.png',
    other: [
      {
        rel: 'apple-touch-icon',
        url: '/yamlrg.png',
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'yamlrg?',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
