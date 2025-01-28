'use client';

import { signInWithGoogle } from "../firebase/authFunctions";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-4">Login</h1>
      <button
        onClick={() => signInWithGoogle(router)}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg mb-4"
      >
        Sign in with Google
      </button>
    </main>
  );
}
