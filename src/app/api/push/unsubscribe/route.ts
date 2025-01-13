import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    // Remove subscription from database
    await deleteDoc(doc(db, 'pushSubscriptions', userId));

    return NextResponse.json({ message: 'Subscription removed successfully' });
  } catch (error) {
    console.error('Error removing push subscription:', error);
    return NextResponse.json(
      { error: 'Failed to remove subscription' },
      { status: 500 }
    );
  }
} 