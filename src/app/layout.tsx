'use client';

import "./globals.css";
import { Inter } from "next/font/google";
import { useEffect, useState } from "react";
import { auth } from "./firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { logOut } from "./firebase/authFunctions";
import { useRouter, usePathname } from "next/navigation";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await logOut();
    router.push('/');
  };

  const showYamlrgText = pathname !== '/';

  return (
    <html lang="en" className={inter.variable}>
      <body>
        <header className="py-4 px-6">
          <div className="container mx-auto flex justify-between items-center">
            {user && showYamlrgText && (
              <a href="/" className="cursor-pointer">
                YAMLRG
              </a>
            )}
            {(!user || !showYamlrgText) && <div />} {/* Empty div for spacing when no logo */}
            <nav>
              {!user && (
                <a href="/login" className="cursor-pointer">
                  Login
                </a>
              )}
              {user && (
                <div className="space-x-4">
                  <a href="/members" className="cursor-pointer">
                    Members
                  </a>
                  <a href="/profile" className="cursor-pointer">
                    Profile
                  </a>
                  <button onClick={handleLogout} className="cursor-pointer">
                    Logout
                  </button>
                </div>
              )}
            </nav>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
