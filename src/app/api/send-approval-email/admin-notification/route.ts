import { NextResponse } from 'next/server';
import { sendAdminNotification } from '../route';

export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    await sendAdminNotification(requestData);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending admin notification:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 