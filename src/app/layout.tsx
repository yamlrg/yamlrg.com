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

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

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
  };

  const showYamlrgText = pathname !== '/';

  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="h-full">
        <div className="h-full flex flex-col">
          <header className="py-2 px-4 sm:px-6 lg:px-8 border-b">
            <div className="container mx-auto flex justify-between items-center">
              {user && showYamlrgText && (
                <Link href="/" className="cursor-pointer">
                  YAMLRG
                </Link>
              )}
              {(!user || !showYamlrgText) && <div />}
              
              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center gap-4">
                {!user && (
                  <Link href="/login" className="cursor-pointer">
                    Login
                  </Link>
                )}
                {user && (
                  <div className="flex items-center">
                    <Link href="/members" className="cursor-pointer">
                      Members
                    </Link>
                    <span className="mx-3 text-gray-400">|</span>
                    <Link href="/reading-list" className="cursor-pointer">
                      Reading List
                    </Link>
                    <span className="mx-3 text-gray-400">|</span>
                    <Link href="/profile" className="cursor-pointer">
                      Profile
                    </Link>
                    {isAdmin && (
                      <>
                        <span className="mx-3 text-gray-400">|</span>
                        <Link href="/admin" className="cursor-pointer text-blue-600 font-semibold">
                          Admin
                        </Link>
                      </>
                    )}
                    <span className="mx-3 text-gray-400">|</span>
                    <button
                      onClick={handleLogout}
                      className="cursor-pointer"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </nav>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
