'use client';

import "./globals.css";
import { Inter } from "next/font/google";
import { useEffect, useState } from "react";
import { auth } from "./firebase/firebaseConfig";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { logOut } from "./firebase/authFunctions";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ADMIN_EMAILS } from "./admin/page";

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
    <html lang="en" className={inter.variable}>
      <body>
        <header className="py-4 px-6">
          <div className="container mx-auto flex justify-between items-center">
            {user && showYamlrgText && (
              <Link href="/" className="cursor-pointer">
                YAMLRG
              </Link>
            )}
            {(!user || !showYamlrgText) && <div />} {/* Empty div for spacing when no logo */}
            <nav>
              {!user && (
                <Link href="/login" className="cursor-pointer">
                  Login
                </Link>
              )}
              {user && (
                <div className="space-x-4">
                  <Link href="/members" className="cursor-pointer">
                    Members
                  </Link>
                  <Link href="/profile" className="cursor-pointer">
                    Profile
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" className="cursor-pointer text-blue-600 font-semibold">
                      Admin
                    </Link>
                  )}
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
