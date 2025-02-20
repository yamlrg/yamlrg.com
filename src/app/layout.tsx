import "./globals.css";
import { Inter } from "next/font/google";
import Link from "next/link";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import Navigation from "@/components/Navigation";
import ClientWrapper from "@/components/ClientWrapper";

console.log('Current NODE_ENV:', process.env.NODE_ENV);

if (typeof window === 'undefined') {
  validateEnvVars();
}

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const GA_MEASUREMENT_ID = 'G-F99YRJFQ3K';

export function validateEnvVars() {
  const required = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_FIREBASE_CLIENT_EMAIL',
    'NEXT_FIREBASE_PRIVATE_KEY',
    'NEXT_RESEND_API_KEY'
  ];
  
  const missing = required.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.join('\n')}`
    );
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <head>
        <GoogleAnalytics GA_MEASUREMENT_ID={GA_MEASUREMENT_ID} />
      </head>
      <body className="min-h-screen">
        <ClientWrapper>
          <div className="min-h-screen flex flex-col">
            <header className="py-2 px-4 sm:px-6 lg:px-8 border-b">
              <div className="container mx-auto">
                <Navigation />
              </div>
            </header>
            <main className="flex-1">
              {children}
            </main>
            <footer className="text-xs py-4 border-t mt-auto">
              <div className="max-w-7xl mx-auto px-4">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-gray-600">
                    Created by{' '}
                    <a 
                      className="text-emerald-700 hover:text-emerald-800" 
                      href="https://www.linkedin.com/in/marialuqueanguita/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      María Luque Anguita
                    </a>
                    {' '}and{' '}
                    <a 
                      className="text-emerald-700 hover:text-emerald-800" 
                      href="https://callum.tilbury.co.za" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      Callum Rhys Tilbury
                    </a>
                  </div>
                  <div className="flex items-center gap-4 text-gray-600">
                    <Link href="/privacy" className="hover:text-emerald-700">
                      Privacy Policy
                    </Link>
                    <span>•</span>
                    <Link href="/terms" className="hover:text-emerald-700">
                      Terms of Service
                    </Link>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </ClientWrapper>
      </body>
    </html>
  );
}
