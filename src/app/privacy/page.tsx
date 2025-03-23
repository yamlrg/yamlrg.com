'use client';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Data Collection and Usage</h2>
          <p className="mb-4">YAMLRG collects and stores the following information:</p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>Basic profile information from your Google account (name, email, profile picture)</li>
            <li>LinkedIn profile URL (if provided)</li>
            <li>Professional status indicators (e.g., looking for co-founders, hiring status)</li>
            <li>Job listings you post</li>
            <li>Workshop and presentation requests</li>
          </ul>
          <p>This information is used to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Create and maintain your member profile</li>
            <li>Display your information in the members directory (if you choose to be visible)</li>
            <li>Facilitate connections between members</li>
            <li>Manage workshop and presentation scheduling</li>
            <li>Send important notifications about your account and community updates</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Data Storage and Security</h2>
          <p className="mb-4">Your data is stored securely in Firebase, Google&apos;s cloud platform. We implement security best practices including:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Secure authentication through Google Sign-In</li>
            <li>Firestore security rules to protect your data</li>
            <li>HTTPS encryption for all data transfers</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Data Control</h2>
          <p className="mb-4">You have control over your data:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Choose whether your profile is visible in the members directory</li>
            <li>Edit or update your profile information at any time</li>
            <li>Delete your account and associated data</li>
            <li>Request your data by contacting the administrators</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Contact</h2>
          <p>For any privacy-related questions, please contact the administrators:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>María Luque Anguita - mluqueanguita@gmail.com</li>
            <li>Callum Tilbury - ctilbury8@gmail.com</li>
          </ul>
        </section>
      </div>
    </main>
  );
} 