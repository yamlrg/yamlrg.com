'use client';

import ProtectedPage from "@/components/ProtectedPage";

export default function MembersPage() {
  return (
    <ProtectedPage>
      <main className="min-h-screen p-4">
        <h1 className="text-3xl font-bold text-center mb-8">YAMLRG Members ✨</h1>
        {/* Protected content goes here */}
      </main>
    </ProtectedPage>
  );
}
