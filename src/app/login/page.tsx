'use client';

import { signInWithGoogle } from "../firebase/authFunctions";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
    const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-4">Login</h1>
      <button
        onClick={() => signInWithGoogle(router)}
        className="bg-emerald-700 text-white py-2 px-8 rounded hover:bg-emerald-800"
      >
        Sign in with Google
      </button>
      <p className="text-sm text-gray-600 mt-4">
        Don&apos;t have an account?{' '}
        <Link href="/join" className="text-emerald-700 hover:text-emerald-800">
          Request to join YAMLRG
        </Link>
      </p>
    </main>
  );
}
