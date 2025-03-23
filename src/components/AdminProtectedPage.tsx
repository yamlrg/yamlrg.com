'use client';

import { useEffect } from "react";
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from "../app/firebase/firebaseConfig";
import { useRouter } from "next/navigation";
import { ADMIN_EMAILS } from "@/app/config/admin";
import ProtectedPage from "./ProtectedPage";

export default function AdminProtectedPage({ children }: { children: React.ReactNode }) {
  const [user] = useAuthState(auth);
  const router = useRouter();

  useEffect(() => {
    if (user && !ADMIN_EMAILS.includes(user.email || '')) {
      router.replace('/');
    }
  }, [user, router]);

  return (
    <ProtectedPage>
      {user && ADMIN_EMAILS.includes(user.email || '') ? children : null}
    </ProtectedPage>
  );
} 