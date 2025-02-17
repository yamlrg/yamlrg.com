import { Resend } from 'resend';
import { adminAuth } from '@/app/firebase/firebaseAdmin';
import { ADMIN_EMAILS } from '@/app/config/admin';
import { DecodedIdToken } from 'firebase-admin/auth';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.NEXT_RESEND_API_KEY);

// Add initialization check
if (!resend) {
  console.error('Failed to initialize Resend');
  throw new Error('Email service initialization failed');
}

export async function GET() {
  return NextResponse.json({ status: 'healthy' });
}

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
    
    let decodedToken: DecodedIdToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
      console.log('Token verified for user:', decodedToken.email);
    } catch (tokenError) {
      console.error('Token verification failed:', tokenError);
      return Response.json({ 
        error: 'Invalid token',
        details: tokenError instanceof Error ? tokenError.message : 'Unknown token error'
      }, { status: 401 });
    }

    // Layer 3: Email must be in admin whitelist
    if (!ADMIN_EMAILS.includes(decodedToken.email || '')) {
      console.error('User not in admin whitelist:', decodedToken.email);
      return Response.json({ 
        error: 'Forbidden',
        details: `User ${decodedToken.email} is not an admin`
      }, { status: 403 });
    }

    // Process email
    let emailData;
    try {
      emailData = await request.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return Response.json({ 
        error: 'Invalid request body',
        details: 'Failed to parse request JSON'
      }, { status: 400 });
    }

    const { email } = emailData;
    if (!email) {
      return Response.json({ 
        error: 'Invalid request',
        details: 'Email is required'
      }, { status: 400 });
    }

    console.log('Starting email send process to:', email);
    console.log('API Key exists:', !!process.env.NEXT_RESEND_API_KEY);

    if (!process.env.NEXT_RESEND_API_KEY) {
      console.error('Missing Resend API key in environment');
      return Response.json({ 
        error: 'Server configuration error',
        details: 'Missing API key'
      }, { status: 500 });
    }

    try {
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
        console.error('Resend API error:', error);
        return Response.json({ 
          error: 'Email send failed',
          details: error.message
        }, { status: 500 });
      }

      console.log('Email sent successfully to:', email);
      return Response.json({ success: true, data });
      
    } catch (sendError) {
      console.error('Error sending email:', sendError);
      return Response.json({ 
        error: 'Email send failed',
        details: sendError instanceof Error ? sendError.message : 'Unknown send error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Unhandled error in email send process:', error);
    return Response.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 