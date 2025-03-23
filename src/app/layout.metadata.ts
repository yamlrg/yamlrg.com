import { Metadata } from "next";

// This is a configuration object that Next.js uses for static metadata
export const metadata: Metadata = {
  title: "yamlrg?",
  description: "Yet Another Machine Learning Reading Group",
  metadataBase: new URL('https://yamlrg.com'),
  openGraph: {
    title: "yamlrg?",
    description: "Yet Another Machine Learning Reading Group",
    url: 'https://yamlrg.com',
    siteName: 'YAMLRG',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: "/yamlrg.webp",
        width: 1200,
        height: 630,
        alt: "YAMLRG Logo",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'yamlrg?',
    description: 'Yet Another Machine Learning Reading Group',
    images: ['/yamlrg.webp'],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/yamlrg.png",
    apple: "/yamlrg.png",
    other: [
      {
        rel: "apple-touch-icon",
        url: "/yamlrg.png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "yamlrg?",
  },
}; 