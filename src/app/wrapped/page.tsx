'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import UserDetailsModal from './components/UserDetailsModal'
import wrapped1Json from './data/wrapped1.json';
import wrapped2 from './data/wrapped2.json'
import { auth } from "../firebase/firebaseConfig";
import { getUserProfile } from "../firebase/firestoreOperations";
import { ADMIN_EMAILS } from '../config/admin';
import ProtectedPage from "@/components/ProtectedPage";

type UserStats = {
  message_count: number;
  emoji_count: number;
  active_hours: Record<string, number>;
}

type Wrapped1Type = {
  total_messages: number;
  total_participants: number;
  user_stats: Record<string, UserStats>;
  top_stats: {
    top_active_members: Array<Array<string | number>>;
    top_active_hours: Array<Array<number>>;
    top_busy_days: Array<Array<string>>;
  };
}

const wrapped1 = wrapped1Json as Wrapped1Type;

export default function WrappedPage() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkAuthorization = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return;
      }

      // Check if user is admin
      if (ADMIN_EMAILS.includes(currentUser.email || '')) {
        setIsAuthorized(true);
        return;
      }

      // Check if user is approved
      const userProfile = await getUserProfile(currentUser.uid);
      setIsAuthorized(userProfile?.isApproved || false);
    };

    checkAuthorization();
  }, []);

  // Show unauthorized message
  if (!isAuthorized) {
    return (
      <ProtectedPage>
        <main className="min-h-screen flex flex-col items-center justify-center p-4">
          <button 
            onClick={() => router.push('/')}
            className="absolute top-4 left-4 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            ← Return Home
          </button>
          <h1 className="text-2xl mb-4">YAMLRG Wrapped 2024 🎁</h1>
          <p className="text-center mb-4">
            This content is only available to approved members.
          </p>
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            Please contact an admin for approval.
          </p>
        </main>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage>
      <main className="min-h-screen p-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <button 
              onClick={() => router.push('/')}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              ← Return Home
            </button>
          </div>
          <h1 className="text-3xl font-bold text-center mb-8">YAMLRG Year in Review 2024 ✨</h1>
          
          <div className="space-y-8">
            {/* Most Active Member Section */}
            <section className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 rounded-lg text-white">
              <h2 className="text-2xl font-bold mb-4">Most Active Member</h2>
              <button 
                onClick={() => setSelectedUser(String(wrapped1.top_stats.top_active_members[0][0]))}
                className="hover:text-blue-200 transition-colors"
              >
                <p className="text-4xl font-bold">{wrapped1.top_stats.top_active_members[0][0]}</p>
                <p className="text-lg">{wrapped1.top_stats.top_active_members[0][1]} messages</p>
              </button>
              <div className="mt-4 space-y-2">
                {wrapped1.top_stats.top_active_members.slice(1, 5).map(([name, count], index) => (
                  <div key={index} className="flex justify-between items-center">
                    <button 
                      onClick={() => setSelectedUser(String(name))}
                      className="hover:text-blue-200 transition-colors"
                    >
                      {name}
                    </button>
                    <span>{count} messages</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Peak Activity Time */}
            <section className="bg-gradient-to-r from-blue-500 to-teal-500 p-6 rounded-lg text-white">
              <h2 className="text-2xl font-bold mb-4">Peak Activity Time</h2>
              <p className="text-4xl font-bold">{wrapped1.top_stats.top_active_hours[0][0]}:00</p>
              <p className="text-lg">{wrapped1.top_stats.top_active_hours[0][1]} messages</p>
              <div className="mt-4 space-y-2">
                {wrapped1.top_stats.top_active_hours.slice(1, 5).map(([hour, count], index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span>{hour}:00</span>
                    <span>{count} messages</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Research Topics */}
            <section className="bg-gradient-to-r from-orange-500 to-red-500 p-6 rounded-lg text-white">
              <h2 className="text-2xl font-bold mb-4">Research Topics</h2>
              <div className="space-y-4">
                {Object.entries(wrapped2.topics_sparking_conversations.AI_Research_Papers.subcategories)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([topic, count], index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className={index === 0 ? "text-4xl font-bold" : ""}>{topic}</span>
                      <span>{count} discussions</span>
                    </div>
                  ))
                }
              </div>
            </section>

            {/* Most Active Day */}
            <section className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 rounded-lg text-white">
              <h2 className="text-2xl font-bold mb-4">Busiest Days</h2>
              <p className="text-4xl font-bold">{wrapped1.top_stats.top_busy_days[0][0]}</p>
              <p className="text-lg">{wrapped1.top_stats.top_busy_days[0][1]} messages</p>
              <div className="mt-4 space-y-2">
                {wrapped1.top_stats.top_busy_days.slice(1, 5).map(([date, count], index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span>{date}</span>
                    <span>{count} messages</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Resource Sharers */}
            <section className="bg-gradient-to-r from-indigo-500 to-purple-500 p-6 rounded-lg text-white">
              <h2 className="text-2xl font-bold mb-4">Top Resource Sharers</h2>
              <button 
                onClick={() => setSelectedUser(String(wrapped2.most_shared_links[0].user))}
                className="hover:text-blue-200 transition-colors"
              >
                <p className="text-4xl font-bold">{wrapped2.most_shared_links[0].user}</p>
                <p className="text-lg">{wrapped2.most_shared_links[0].count} links shared</p>
              </button>
              <div className="mt-4 space-y-2">
                {wrapped2.most_shared_links.slice(1, 5).map((sharer, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <button 
                      onClick={() => setSelectedUser(String(sharer.user))}
                      className="hover:text-blue-200 transition-colors"
                    >
                      {sharer.user}
                    </button>
                    <span>{sharer.count} links</span>
                  </div>
                ))}
              </div>
            </section>

            {/* All Members */}
            <section className="bg-gradient-to-r from-teal-500 to-cyan-500 p-6 rounded-lg text-white">
              <h2 className="text-2xl font-bold mb-4">All Members</h2>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(wrapped1.user_stats)
                  .sort(([,a], [,b]) => b.message_count - a.message_count)
                  .map(([name, data]) => (
                    <button
                      key={name}
                      onClick={() => setSelectedUser(String(name))}
                      className="text-left hover:bg-white/10 p-2 rounded transition-colors"
                    >
                      {name} ({data.message_count} messages)
                    </button>
                  ))
                }
              </div>
            </section>
          </div>

          {/* User Details Modal */}
          {selectedUser && 
            Object.prototype.hasOwnProperty.call(wrapped1.user_stats, selectedUser) && (
            <UserDetailsModal
              user={{
                name: selectedUser,
                ...wrapped1.user_stats[selectedUser]
              }}
              onClose={() => setSelectedUser(null)}
            />
          )}
        </div>
      </main>
    </ProtectedPage>
  )
} 