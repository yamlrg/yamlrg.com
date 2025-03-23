'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { trackEvent } from "@/utils/analytics";
import { logOut } from "../app/firebase/authFunctions";

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === '/logout') {
      logOut().then(() => router.push('/'));
    }
  }, [pathname, router]);

  useEffect(() => {
    trackEvent('page_view', {
      page_title: document.title,
      page_location: window.location.href,
      page_path: window.location.pathname
    });
  }, []);

  return <>{children}</>;
} 