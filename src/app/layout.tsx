'use client';

import "./globals.css";
import { Inter } from "next/font/google";
import { useEffect, useState, Fragment } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ADMIN_EMAILS } from "./config/admin";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { trackEvent } from "@/utils/analytics";
import { 
  UserGroupIcon, 
  PresentationChartBarIcon, 
  DocumentTextIcon,
  UserIcon,
  Bars3Icon,
  UsersIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { logOut } from "./firebase/authFunctions";
import { auth } from "./firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

console.log('Current NODE_ENV:', process.env.NODE_ENV);

if (typeof window === 'undefined') {
  validateEnvVars();
}

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const GA_MEASUREMENT_ID = 'G-F99YRJFQ3K';

export function validateEnvVars() {
  const required = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_FIREBASE_CLIENT_EMAIL',
    'NEXT_FIREBASE_PRIVATE_KEY',
    'NEXT_RESEND_API_KEY'
  ];
  
  const missing = required.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.join('\n')}`
    );
  }
}

const navItems = [
  { href: '/members', label: 'Members', icon: <UserGroupIcon className="w-6 h-6" /> },
  { href: '/gradient-connect', label: 'Gradient Connect', icon: <UsersIcon className="w-6 h-6" /> },
  { href: '/workshops', label: 'Workshops', icon: <PresentationChartBarIcon className="w-6 h-6" /> },
  { href: '/reading-list', label: 'Reading list', icon: <DocumentTextIcon className="w-6 h-6" /> },
  { href: '/profile', label: 'Profile', icon: <UserIcon className="w-6 h-6" /> },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser?.email) {
        setIsAdmin(ADMIN_EMAILS.includes(currentUser.email));
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await logOut();
    router.push('/');
  };

  useEffect(() => {
    if (pathname === '/logout') {
      handleLogout();
    }
  }, [pathname]);

  useEffect(() => {
    trackEvent('page_view', {
      page_title: document.title,
      page_location: window.location.href,
      page_path: window.location.pathname
    });
  }, []);

  const showYamlrgText = pathname !== '/';

  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <head>
        <GoogleAnalytics GA_MEASUREMENT_ID={GA_MEASUREMENT_ID} />
      </head>
      <body className="min-h-screen">
        <div className="min-h-screen flex flex-col">
          <header className="py-2 px-4 sm:px-6 lg:px-8 border-b">
            <div className="container mx-auto flex justify-between items-center">
              <div className="flex items-center">
                {showYamlrgText && (
                  <Link href="/" className="cursor-pointer">
                    YAMLRG
                  </Link>
                )}
                {!showYamlrgText && <div />}
              </div>

              <nav>
                <div className="max-w-7xl mx-auto">
                  <div className="flex items-center justify-end h-14">
                    {/* Desktop Navigation */}
                    <div className="hidden md:flex md:items-center md:gap-6">
                      {navItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="group relative flex items-center justify-center p-2 text-gray-600 hover:text-emerald-700 transition-colors"
                        >
                          {item.icon}
                          <span className="absolute top-full mt-1 whitespace-nowrap bg-gray-800 text-white text-sm py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            {item.label}
                          </span>
                        </Link>
                      ))}
                      
                      {/* Add Admin link to desktop nav */}
                      {isAdmin && (
                        <Link
                          href="/admin"
                          className="group relative flex items-center justify-center p-2 text-gray-600 hover:text-emerald-700 transition-colors"
                        >
                          <Cog6ToothIcon className="w-6 h-6" />
                          <span className="absolute top-full mt-1 whitespace-nowrap bg-gray-800 text-white text-sm py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            Admin
                          </span>
                        </Link>
                      )}
                    </div>

                    {/* Mobile Navigation */}
                    <div className="md:hidden flex items-center">
                      <Menu as="div" className="relative z-50">
                        <Menu.Button className="p-2 text-gray-600 hover:text-gray-900">
                          <Bars3Icon className="h-6 w-6" />
                        </Menu.Button>
                        <Transition
                          as={Fragment}
                          enter="transition ease-out duration-100"
                          enterFrom="transform opacity-0 scale-95"
                          enterTo="transform opacity-100 scale-100"
                          leave="transition ease-in duration-75"
                          leaveFrom="transform opacity-100 scale-100"
                          leaveTo="transform opacity-0 scale-95"
                        >
                          <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                            <div className="py-1">
                              {navItems.map((item) => (
                                <Menu.Item key={item.href}>
                                  {({ active }) => (
                                    <div className="px-1 py-1">
                                      <Link
                                        href={item.href}
                                        className={`${
                                          active ? 'bg-gray-100' : ''
                                        } flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-md group w-full`}
                                      >
                                        {item.icon}
                                        <span>{item.label}</span>
                                      </Link>
                                    </div>
                                  )}
                                </Menu.Item>
                              ))}
                              
                              {/* Add Admin link for admin users */}
                              {isAdmin && (
                                <Menu.Item>
                                  {({ active }) => (
                                    <div className="px-1 py-1">
                                      <Link
                                        href="/admin"
                                        className={`${
                                          active ? 'bg-gray-100' : ''
                                        } flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-md group w-full`}
                                      >
                                        <Cog6ToothIcon className="w-6 h-6" />
                                        <span>Admin</span>
                                      </Link>
                                    </div>
                                  )}
                                </Menu.Item>
                              )}
                            </div>
                          </Menu.Items>
                        </Transition>
                      </Menu>
                    </div>
                  </div>
                </div>
              </nav>
            </div>
          </header>
          <main className="flex-1">
            {children}
          </main>
          <footer className="text-xs py-4 border-t mt-auto">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-gray-600">
                  Created by{' '}
                  <a 
                    className="text-emerald-700 hover:text-emerald-800" 
                    href="https://www.linkedin.com/in/marialuqueanguita/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    María Luque Anguita
                  </a>
                  {' '}and{' '}
                  <a 
                    className="text-emerald-700 hover:text-emerald-800" 
                    href="https://callum.tilbury.co.za" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    Callum Rhys Tilbury
                  </a>
                </div>
                <div className="flex items-center gap-4 text-gray-600">
                  <Link href="/privacy" className="hover:text-emerald-700">
                    Privacy Policy
                  </Link>
                  <span>•</span>
                  <Link href="/terms" className="hover:text-emerald-700">
                    Terms of Service
                  </Link>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
