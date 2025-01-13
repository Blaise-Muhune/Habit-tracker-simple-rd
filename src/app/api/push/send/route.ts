import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const vapidKeys = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  privateKey: process.env.VAPID_PRIVATE_KEY!,
  subject: 'mailto:your-actual-email@domain.com'
};

webpush.setVapidDetails(
  vapidKeys.subject,
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

export async function POST(request: Request) {
  try {
    const { userId, message, title } = await request.json();

    // Get user preferences
    const prefsDoc = await getDoc(doc(db, 'userPreferences', userId));
    if (!prefsDoc.exists()) {
      return NextResponse.json({ error: 'User preferences not found' }, { status: 404 });
    }

    const prefs = prefsDoc.data();
    
    // Send push notification if enabled
    if (prefs.pushReminders && prefs.pushSubscription) {
      try {
        // Convert serialized subscription back to format web-push expects
        const pushSubscription = {
          endpoint: prefs.pushSubscription.endpoint,
          keys: prefs.pushSubscription.keys
        };

        console.log('Sending push notification:', {
          title: title,
          body: message,
          icon: '/icon.png',
          badge: '/badge.png',
          data: {
            url: '/',
            timestamp: new Date().toISOString(),
            type: 'task-reminder'
          }
        });

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify({
            title: title,
            body: message,
            icon: '/icon.png',
            badge: '/badge.png',
            data: {
              url: '/',
              timestamp: new Date().toISOString(),
              type: 'task-reminder'
            }
          })
        );
      } catch (error) {
        console.error('Push notification failed:', error);
        // If push subscription is invalid, update preferences to disable push
        if (error instanceof webpush.WebPushError && (error.statusCode === 410 || error.statusCode === 404)) {
          await setDoc(doc(db, 'userPreferences', userId), {
            ...prefs,
            pushReminders: false,
            pushSubscription: null
          });
        }
      }
    }

    return NextResponse.json({ message: 'Notifications sent successfully' });
  } catch (error) {
    console.error('Error processing notifications:', error);
    return NextResponse.json(
      { error: 'Failed to process notifications' },
      { status: 500 }
    );
  }
} 