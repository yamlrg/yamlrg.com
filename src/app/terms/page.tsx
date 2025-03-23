'use client';

export default function TermsPage() {
  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">1. Membership</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Membership is by approval only</li>
            <li>You must provide accurate information during registration</li>
            <li>You are responsible for maintaining the confidentiality of your account</li>
            <li>Administrators reserve the right to revoke membership at their discretion</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">2. Content and Conduct</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>You are responsible for all content you post (job listings, workshop requests, etc.)</li>
            <li>Content must be professional and relevant to the community</li>
            <li>No spam, harassment, or inappropriate content</li>
            <li>Job postings must be legitimate opportunities</li>
            <li>Workshop and presentation content must be original or properly attributed</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">3. Intellectual Property</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>You retain rights to your content</li>
            <li>Workshop recordings and materials may be shared within the community</li>
            <li>Respect intellectual property rights when sharing content</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">4. Community Guidelines</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Be respectful and professional in all interactions</li>
            <li>No commercial spam or unsolicited advertising</li>
            <li>Contribute constructively to discussions</li>
            <li>Report any violations to administrators</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">5. Termination</h2>
          <p className="mb-4">YAMLRG reserves the right to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Terminate accounts that violate these terms</li>
            <li>Remove content that violates these terms</li>
            <li>Modify or discontinue services at any time</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">6. Disclaimer</h2>
          <p>YAMLRG is provided &quot;as is&quot; without warranties of any kind. We are not responsible for:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Accuracy of member-provided information</li>
            <li>Outcomes of member interactions or job applications</li>
            <li>Content shared in workshops or presentations</li>
            <li>Technical issues or service interruptions</li>
          </ul>
        </section>
      </div>
    </main>
  );
} 