'use client';

import "./globals.css";
import { Inter } from "next/font/google";
import { useEffect, useState } from "react";
import { auth } from "./firebase/firebaseConfig";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { logOut } from "./firebase/authFunctions";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ADMIN_EMAILS } from "./config/admin";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import Image from "next/image";

console.log('Current NODE_ENV:', process.env.NODE_ENV);

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const GA_MEASUREMENT_ID = 'G-F99YRJFQ3K';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser?.email) {
        setIsAdmin(ADMIN_EMAILS.includes(currentUser.email));
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await logOut();
    router.push('/');
    setShowDropdown(false);
  };

  const showYamlrgText = pathname !== '/';

  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <head>
        <GoogleAnalytics GA_MEASUREMENT_ID={GA_MEASUREMENT_ID} />
      </head>
      <body className="h-full">
        <div className="h-full flex flex-col">
          <header className="py-2 px-4 sm:px-6 lg:px-8 border-b">
            <div className="container mx-auto flex justify-between items-center">
              <div className="flex items-center">
                {user && showYamlrgText && (
                  <Link href="/" className="cursor-pointer">
                    YAMLRG
                  </Link>
                )}
                {(!user || !showYamlrgText) && <div />}
              </div>

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900"
              >
                <span className="sr-only">Open menu</span>
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                  />
                </svg>
              </button>
              
              <nav className="hidden md:flex items-center gap-4">
                {!user && (
                  <Link 
                    href="/login" 
                    className={`hover:text-gray-900 ${pathname === '/login' ? 'font-semibold' : ''}`}
                  >
                    Login
                  </Link>
                )}
                {user && (
                  <div className="flex items-center">
                    <Link 
                      href="/members" 
                      className={`hover:text-gray-900 ${pathname === '/members' ? 'font-semibold' : ''}`}
                    >
                      Members
                    </Link>
                    <span className="mx-3 text-gray-400">|</span>
                    <Link 
                      href="/reading-list" 
                      className={`hover:text-gray-900 ${pathname === '/reading-list' ? 'font-semibold' : ''}`}
                    >
                      Reading List
                    </Link>
                    <span className="mx-3 text-gray-400">|</span>
                    <Link
                      href="/jobs"
                      className={`hover:text-gray-900 ${pathname === '/jobs' ? 'font-semibold' : ''}`}
                    >
                      Jobs
                    </Link>
                    
                    <span className="mx-3 text-gray-400">|</span>
                    
                    <div className="relative ml-4">
                      <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="flex items-center"
                      >
                        {user.photoURL ? (
                          <Image
                            src={user.photoURL}
                            alt="Profile"
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            {user.displayName?.[0] || user.email?.[0] || '?'}
                          </div>
                        )}
                      </button>

                      {showDropdown && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border">
                          <Link
                            href="/profile"
                            className={`block px-4 py-2 hover:bg-gray-100 ${pathname === '/profile' ? 'font-semibold' : ''}`}
                            onClick={() => setShowDropdown(false)}
                          >
                            Profile
                          </Link>
                          {isAdmin && (
                            <Link
                              href="/admin"
                              className={`block px-4 py-2 hover:bg-gray-100 ${pathname === '/admin' ? 'font-semibold' : ''}`}
                              onClick={() => setShowDropdown(false)}
                            >
                              Admin
                            </Link>
                          )}
                          <button
                            onClick={handleLogout}
                            className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                          >
                            Logout
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </nav>
            </div>

            {isMobileMenuOpen && (
              <div className="md:hidden">
                <div className="px-2 pt-2 pb-3 space-y-1">
                  {!user ? (
                    <Link
                      href="/login"
                      className="block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Login
                    </Link>
                  ) : (
                    <>
                      <Link
                        href="/members"
                        className="block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Members
                      </Link>
                      <Link
                        href="/reading-list"
                        className="block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Reading List
                      </Link>
                      <Link
                        href="/jobs"
                        className="block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Jobs
                      </Link>
                      <Link
                        href="/profile"
                        className="block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Profile
                      </Link>
                      {isAdmin && (
                        <Link
                          href="/admin"
                          className="block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Admin
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsMobileMenuOpen(false);
                        }}
                        className="block w-full text-left px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100"
                      >
                        Logout
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
