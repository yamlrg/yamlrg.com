import { Resend } from 'resend';
import { adminAuth } from '@/app/firebase/firebaseAdmin';
import { ADMIN_EMAILS } from '@/app/config/admin';

const resend = new Resend(process.env.NEXT_RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    // Layer 1: Requires a valid Firebase auth token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Layer 2: Token must be valid (verified by Firebase Admin)
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Layer 3: Email must be in admin whitelist
    if (!ADMIN_EMAILS.includes(decodedToken.email || '')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Process email
    const { email } = await request.json();
    console.log('Starting email send process to:', email);
    console.log('API Key exists:', !!process.env.NEXT_RESEND_API_KEY);

    if (!process.env.NEXT_RESEND_API_KEY) {
      throw new Error('Missing Resend API key');
    }

    const { data, error } = await resend.emails.send({
      from: 'YAMLRG <hello@onboarding.yamlrg.com>',
      to: email,
      subject: 'Welcome to YAMLRG!',
      html: `
        <h1>Welcome to YAMLRG! 🎉</h1>
        <p>Your request to join has been approved. You can now join our WhatsApp group:</p>
        <p><a href="https://chat.whatsapp.com/DMqsymB8YmFD5za7R9IdwO">Click here to join the WhatsApp group</a></p>
        <p>We're excited to have you as part of our community!</p>
        <p>Please also complete your profile on the website: <a href="https://yamlrg.com/profile">https://yamlrg.com/profile</a></p>
      `
    });

    if (error) {
      console.error('Resend API error details:', error);
      return Response.json({ error }, { status: 400 });
    }

    console.log('Email sent successfully, response:', data);
    return Response.json({ data });
  } catch (error) {
    console.error('Detailed error in send-approval-email:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
} 