import { Resend } from 'resend';
import { adminAuth } from '@/app/firebase/firebaseAdmin';
import { ADMIN_EMAILS } from '@/app/config/admin';

const resend = new Resend(process.env.NEXT_RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    console.log('Starting email send process');
    
    // Layer 1: Requires a valid Firebase auth token
    const authHeader = request.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Missing or invalid auth header');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Layer 2: Token must be valid (verified by Firebase Admin)
    const token = authHeader.split('Bearer ')[1];
    console.log('Attempting to verify token');
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      console.log('Token verified for user:', decodedToken.email);
    } catch (tokenError) {
      console.error('Token verification failed:', tokenError);
      return Response.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Layer 3: Email must be in admin whitelist
    if (!ADMIN_EMAILS.includes(decodedToken.email || '')) {
      console.error('User not in admin whitelist:', decodedToken.email);
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Process email
    const { email } = await request.json();
    console.log('Starting email send process to:', email);
    console.log('API Key exists:', !!process.env.NEXT_RESEND_API_KEY);
    console.log('Sending welcome email with WhatsApp group link...');

    if (!process.env.NEXT_RESEND_API_KEY) {
      console.error('Missing Resend API key in environment');
      return Response.json({ error: 'Server configuration error' }, { status: 500 });
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

    console.log('Resend API response:', { data, error });

    if (error) {
      console.error('Resend API error details:', {
        error,
        message: error.message,
        name: error.name,
        statusCode: error.statusCode
      });
      return Response.json({ error: error.message }, { status: 500 });
    }

    console.log('Email sent successfully to:', email);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error in email send process:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return Response.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 