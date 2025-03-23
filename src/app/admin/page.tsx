'use client';

import Link from 'next/link';
import { UsersIcon, UserPlusIcon, PresentationChartBarIcon } from '@heroicons/react/24/outline';
import AdminProtectedPage from "@/components/AdminProtectedPage";

export default function AdminPage() {
  return (
    <AdminProtectedPage>
      <main className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
          
          <div className="grid gap-6 md:grid-cols-2">
            {/* Join Requests */}
            <Link 
              href="/admin/join-requests"
              className="flex flex-col items-center p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <UserPlusIcon className="w-12 h-12 text-emerald-600 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Join Requests</h2>
              <p className="text-gray-600 text-center">
                Review and approve new member requests
              </p>
            </Link>

            {/* Members */}
            <Link 
              href="/admin/members"
              className="flex flex-col items-center p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <UsersIcon className="w-12 h-12 text-emerald-600 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Members</h2>
              <p className="text-gray-600 text-center">
                Manage existing members
              </p>
            </Link>

            {/* Workshops */}
            <Link 
              href="/admin/workshops"
              className="flex flex-col items-center p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <PresentationChartBarIcon className="w-12 h-12 text-emerald-600 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Workshops</h2>
              <p className="text-gray-600 text-center">
                Manage workshop requests and presentations
              </p>
            </Link>

            {/* Gradient Connect */}
            <Link 
              href="/admin/gradient-connect"
              className="flex flex-col items-center p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <UsersIcon className="w-12 h-12 text-emerald-600 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Gradient Connect</h2>
              <p className="text-gray-600 text-center">
                Manage 1-on-1 matching and track meetings
              </p>
            </Link>
          </div>
        </div>
      </main>
    </AdminProtectedPage>
  );
}