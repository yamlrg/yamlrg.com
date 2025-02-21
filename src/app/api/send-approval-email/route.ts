import { Resend } from 'resend';
import { adminAuth } from '@/app/firebase/firebaseAdmin';
import { ADMIN_EMAILS } from '@/app/config/admin';
import { DecodedIdToken } from 'firebase-admin/auth';
import { NextResponse } from 'next/server';

// Initialize Resend once
const resend = new Resend(process.env.NEXT_RESEND_API_KEY);

if (!resend) {
  throw new Error('Email service initialization failed');
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ status: 'healthy' });
}

export async function POST(request: Request) {
  try {
    // Layer 1: Validate auth token
    const token = await validateAuthToken(request);
    
    // Layer 2: Validate admin access
    await validateAdminAccess(token);
    
    // Layer 3: Send email
    const { email } = await validateAndParseRequest(request);
    await sendWelcomeEmail(email);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in email send process:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }, { status: getErrorStatus(error) });
  }
}

async function validateAuthToken(request: Request): Promise<DecodedIdToken> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid auth header');
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    return await adminAuth.verifyIdToken(token);
  } catch (error) {
    console.error('Error verifying auth token:', error);
    throw new UnauthorizedError('Invalid token');
  }
}

async function validateAdminAccess(decodedToken: DecodedIdToken) {
  if (!ADMIN_EMAILS.includes(decodedToken.email || '')) {
    throw new ForbiddenError(`User ${decodedToken.email} is not an admin`);
  }
}

async function validateAndParseRequest(request: Request) {
  try {
    const data = await request.json();
    if (!data.email) {
      throw new BadRequestError('Email is required');
    }
    return data;
  } catch (error) {
    console.error('Error parsing request body:', error);
    throw new BadRequestError('Invalid request body');
  }
}

async function sendWelcomeEmail(email: string) {
  if (!process.env.NEXT_RESEND_API_KEY) {
    throw new ConfigurationError('Missing Resend API key');
  }

  try {
    const { error } = await resend.emails.send({
      from: 'YAMLRG <hello@onboarding.yamlrg.com>',
      to: email,
      subject: 'Welcome to YAMLRG!',
      html: `
        <h1>Welcome to YAMLRG! 🎉</h1>
        <p>Your request to join has been approved. You can now join our WhatsApp group:</p>
        <p><a href="https://chat.whatsapp.com/DMqsymB8YmFD5za7R9IdwO">Click here to join the WhatsApp group</a></p>
        <p>When you join the WhatsApp group, feel free to send a short message introducing yourself! 😊</p>
        <p>We're excited to have you as part of our community!</p>
        <p>Please also complete your profile on the website: <a href="https://www.yamlrg.com/login">https://www.yamlrg.com/profile</a></p>
      `
    });

    if (error) {
      throw new EmailError(error.message);
    }
  } catch (error) {
    throw new EmailError(error instanceof Error ? error.message : 'Failed to send email');
  }
}

export const sendAdminNotification = async (newRequest: { name: string; email: string; interests: string; linkedinUrl: string }) => {
  if (!process.env.NEXT_RESEND_API_KEY) {
    throw new ConfigurationError('Missing Resend API key');
  }

  try {
    const { error } = await resend.emails.send({
      from: 'YAMLRG <hello@onboarding.yamlrg.com>',
      to: ADMIN_EMAILS,
      subject: 'New YAMLRG Join Request',
      html: `
        <h2>New Join Request Received</h2>
        <p><strong>Name:</strong> ${newRequest.name}</p>
        <p><strong>Email:</strong> ${newRequest.email}</p>
        <p><strong>LinkedIn:</strong> <a href="${newRequest.linkedinUrl}">${newRequest.linkedinUrl}</a></p>
        <p><strong>Interests:</strong> ${newRequest.interests}</p>
        <p><a href="https://www.yamlrg.com/admin/join-requests">Review request in admin dashboard</a></p>
      `
    });

    if (error) {
      console.error('Error sending admin notification:', error);
    }
  } catch (error) {
    console.error('Error sending admin notification:', error);
    // Don't throw error to prevent blocking the main flow
  }
};

// Custom error classes for better error handling
class APIError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

class UnauthorizedError extends APIError {
  constructor(message: string) {
    super(message, 401);
  }
}

class ForbiddenError extends APIError {
  constructor(message: string) {
    super(message, 403);
  }
}

class BadRequestError extends APIError {
  constructor(message: string) {
    super(message, 400);
  }
}

class ConfigurationError extends APIError {
  constructor(message: string) {
    super(message, 500);
  }
}

class EmailError extends APIError {
  constructor(message: string) {
    super(message, 500);
  }
}

function getErrorStatus(error: unknown): number {
  return error instanceof APIError ? error.status : 500;
} 