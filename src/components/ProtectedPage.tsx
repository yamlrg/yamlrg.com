'use client';

import { useEffect, useState } from "react";
import { auth } from "../app/firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function ProtectedPage({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push("/login"); // Redirect to the login page if not authenticated
      }
    });
    return unsubscribe;
  }, [router]);

  if (!user) {
    return <p>Loading...</p>;
  }

  return <>{children}</>;
}
