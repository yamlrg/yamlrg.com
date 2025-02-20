import { NextResponse } from 'next/server';
import { adminAuth } from '@/app/firebase/firebaseAdmin';
import { getFirestore } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    // Verify auth token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No auth token' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    const { userId, userEmail, userName, matchingDate } = await request.json();

    // Verify that the token matches the user making the request
    if (decodedToken.uid !== userId) {
      return NextResponse.json({ error: 'User ID mismatch' }, { status: 401 });
    }

    try {
      const db = getFirestore();
      const signupsRef = db.collection('gradientConnectSignups');
      
      // Check for existing signup
      const existingSignups = await signupsRef
        .where('userId', '==', userId)
        .where('matchingDate', '==', matchingDate)
        .get();

      if (!existingSignups.empty) {
        return NextResponse.json({ 
          alreadySignedUp: true,
          success: true 
        });
      }

      // Create new signup using admin SDK methods
      const result = await signupsRef.add({
        userId,
        userEmail,
        userName,
        matchingDate,
        signedUpAt: new Date().toISOString(),
        matched: false,
        createdAt: new Date().toISOString()
      });

      return NextResponse.json({ success: true, id: result.id });
    } catch (error) {
      return NextResponse.json({ 
        error: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to sign up' 
    }, { status: 500 });
  }
} 