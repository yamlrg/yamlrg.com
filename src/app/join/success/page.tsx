export default function JoinSuccessPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-4">Request Submitted! 🎉</h1>
      <div className="text-center max-w-md space-y-4">
        <p>
          Thank you for your interest in YAMLRG. We will review your request and send you an email within 24 hours.
        </p>
        <div className="bg-yellow-50 p-4 rounded-lg text-yellow-800">
          <p className="font-medium mb-2">Important:</p>
          <p className="text-sm">
            Please check your spam/junk folder as our emails sometimes end up there.
            If you haven&apos;t received an email within 24 hours, please reach out to Maria.
          </p>
        </div>
        <div className="mt-6 p-4 bg-emerald-50 rounded-lg">
          <p className="text-emerald-800">
            Need help or haven&apos;t received an email?{' '}
            <a 
              href="https://wa.me/447599973293"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 hover:text-emerald-800 underline"
            >
              Message Maria on WhatsApp
            </a>
          </p>
        </div>
      </div>
    </main>
  );
} 