'use client';

import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase/firebaseConfig';
import { getUserProfile } from '../firebase/firestoreOperations';
import { UserProfile } from '../types';
import Link from 'next/link';
import { Menu } from '@headlessui/react';
import { logOut } from '../firebase/authFunctions';
import { useRouter } from 'next/navigation';

export default function Navigation() {
  const [user, loading] = useAuthState(auth);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadProfile = async () => {
      console.log('Navigation: loadProfile called', { user, loading });
      
      if (!user) {
        console.log('Navigation: No user, clearing profile');
        setUserProfile(null);
        return;
      }

      try {
        console.log('Navigation: Fetching profile for user:', user.uid);
        const profile = await getUserProfile(user.uid);
        console.log('Navigation: Profile fetched:', profile);
        setUserProfile(profile);
      } catch (error) {
        console.error('Navigation: Error loading profile:', error);
        setUserProfile(null);
      }
    };

    loadProfile();
  }, [user, loading]); // React to both user and loading changes

  const handleLogout = async () => {
    await logOut();
    setUserProfile(null); // Clear profile on logout
    router.push('/login');
  };

  // Debug render info
  console.log('Navigation: Rendering with:', { 
    hasUser: !!user, 
    loading, 
    hasProfile: !!userProfile 
  });

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold">YAMLRG</span>
            </Link>
          </div>

          <div className="flex items-center">
            {loading ? (
              <div>Loading...</div>
            ) : user && userProfile ? (
              <Menu as="div" className="relative">
                <Menu.Button className="flex items-center">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="Profile"
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-300" />
                  )}
                </Menu.Button>

                <Menu.Items className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                  <Menu.Item>
                    {({ active }) => (
                      <Link
                        href="/profile"
                        className={`${
                          active ? 'bg-gray-100' : ''
                        } block px-4 py-2 text-sm text-gray-700`}
                      >
                        Profile
                      </Link>
                    )}
                  </Menu.Item>
                  
                  {userProfile.isAdmin && (
                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          href="/admin"
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } block px-4 py-2 text-sm text-gray-700`}
                        >
                          Admin
                        </Link>
                      )}
                    </Menu.Item>
                  )}

                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleLogout}
                        className={`${
                          active ? 'bg-gray-100' : ''
                        } block w-full text-left px-4 py-2 text-sm text-gray-700`}
                      >
                        Sign out
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Menu>
            ) : (
              <Link
                href="/login"
                className="text-gray-700 hover:text-gray-900"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 