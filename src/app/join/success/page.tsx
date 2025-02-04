export default function JoinSuccessPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-4">Request Submitted! 🎉</h1>
      <div className="text-center max-w-md space-y-4">
        <p>
          Thank you for your interest in YAMLRG. We will review your request and get back to you via email soon.
        </p>
        <p className="text-sm text-gray-600">
          Please make sure to check your spam folder if you do not hear from us within a few days.
        </p>
        <div className="mt-6 p-4 bg-emerald-50 rounded-lg">
          <p className="text-emerald-800">
            Want fast approval?{' '}
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