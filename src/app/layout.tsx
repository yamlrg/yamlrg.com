import "./globals.css";
import { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "yamlrg?",
  description: "Yet Another Machine Learning Reading Group",
  openGraph: {
    title: "yamlrg?",
    description: "Yet Another Machine Learning Reading Group",
    images: [
      {
        url: "/yamlrg.webp",
        width: 1200,
        height: 630,
        alt: "YAMLRG Logo",
      },
    ],
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <header className="bg-gray-800 text-white py-4">
          <div className="container mx-auto px-4 flex justify-between items-center">
            <h1 className="text-xl font-bold">YAMLRG</h1>
            <nav className="flex space-x-4">
              <a
                href="/"
                className="hover:underline text-gray-200 hover:text-white"
              >
                Home
              </a>
              <a
                href="/login"
                className="hover:underline text-gray-200 hover:text-white"
              >
                Login
              </a>
              <a
                href="/members"
                className="hover:underline text-gray-200 hover:text-white"
              >
                Members
              </a>
              <a
                href="/profile"
                className="hover:underline text-gray-200 hover:text-white"
              >
                Profile
              </a>
            </nav>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
