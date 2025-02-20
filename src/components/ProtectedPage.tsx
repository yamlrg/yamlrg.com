'use client';

import { useEffect, useState } from "react";
import { auth } from "../app/firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { User } from '../app/types';

export default function ProtectedPage({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setLoading(false);
      } else {
        setUser(null);
        setLoading(false);
        router.replace("/login");
      }
    });
    return unsubscribe;
  }, [router]);

  if (!loading && !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-700"></div>
      </div>
    );
  }

  return <>{children}</>;
}
