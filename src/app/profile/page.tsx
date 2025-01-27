'use client';

import { auth } from "../firebase/firebaseConfig";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
    } else {
      router.push("/login"); // Redirect to login if no user is logged in
    }
  }, [router]);

  if (!user) {
    return <p>Loading...</p>;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-4">Welcome, {user.displayName}!</h1>
      <p className="text-lg">Email: {user.email}</p>
    </main>
  );
}
