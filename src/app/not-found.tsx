import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-lg">
        <h2 className="text-3xl font-bold mb-4">404: AI Got Lost! 🤖❓</h2>
        <p className="mb-4 text-gray-600">
          Our AI wandered off into the void and couldn&apos;t find this page.
        </p>
        <div className="bg-gray-100 p-4 rounded-lg mb-6">
          <p className="text-sm text-gray-600">
            Maybe it&apos;s training on some cat videos... 🐱
          </p>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Let&apos;s get you back to somewhere that exists!
        </p>
        <Link
          href="/"
          className="bg-emerald-500 text-white px-6 py-3 rounded-lg hover:bg-emerald-600 transition-colors inline-block"
        >
          Back to Reality 🌍
        </Link>
      </div>
    </div>
  );
} 