'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-lg">
        <h2 className="text-3xl font-bold mb-4">Oops! You broke yamlrg! 🤖💥</h2>
        <p className="mb-4 text-gray-600">
          Here&apos;s what went wrong:
        </p>
        <div className="bg-gray-100 p-4 rounded-lg mb-6 overflow-auto max-h-32">
          <code className="text-sm text-red-600 break-all">
            {error.message || "Unknown error (it's really bad, we don't even know what happened!)"}
          </code>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Screenshot this and send it to María or Callum! They&apos;ll pretend they know what it means 😅
        </p>
        <button
          onClick={() => reset()}
          className="bg-emerald-500 text-white px-6 py-3 rounded-lg hover:bg-emerald-600 transition-colors"
        >
          Let&apos;s Try That Again! 🤞
        </button>
      </div>
    </div>
  );
} 