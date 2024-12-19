import "./globals.css";
import { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'YAMLRG',
  description: 'YAMLRG Community Stats',
  openGraph: {
    title: 'YAMLRG',
    description: 'YAMLRG Community Stats',
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
    apple: '/yamlrg.png',
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
