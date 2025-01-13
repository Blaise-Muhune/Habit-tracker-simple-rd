import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

// Configure web-push with your VAPID keys
webpush.setVapidDetails(
  'mailto:' + process.env.NEXT_PUBLIC_VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: Request) {
  try {
    const { subscription, userId } = await request.json();

    // Store the subscription in Firestore
    await setDoc(doc(db, 'pushSubscriptions', userId), {
      subscription,
      userId,
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ message: 'Subscription added successfully' });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    );
  }
} 