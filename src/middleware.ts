import { NextResponse } from 'next/server';

const allowedOrigins = [
  'https://yamlrg.com',
  'https://www.yamlrg.com'
];

export function middleware() {
  // Get the response
  const response = NextResponse.next();

  // Add the CORS headers with specific origin
  response.headers.set('Access-Control-Allow-Origin', allowedOrigins.join(', '));
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Add Permissions-Policy header with only necessary features
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // Add Cross-Origin-Opener-Policy header
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

  return response;
}

// Specify which routes should be handled by the middleware
export const config = {
  matcher: '/api/:path*',
}; 