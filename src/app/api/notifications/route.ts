import { db } from '@/lib/firebase'; // Import regular Firebase client
import { collection, query, where, getDocs, updateDoc, Timestamp } from 'firebase/firestore';
import { NextResponse } from 'next/server';
import webpush from 'web-push';

// Set up web-push with your VAPID keys
const vapidKeys = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  privateKey: process.env.VAPID_PRIVATE_KEY!,
  subject: 'mailto:'+ process.env.NEXT_PUBLIC_VAPID_EMAIL!
};

webpush.setVapidDetails(
  vapidKeys.subject,
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

async function sendEmailNotification(task: any, email: string) {
  try {
    // Call your email endpoint
    const response = await fetch(new URL('/api/send-reminder', process.env.NEXT_PUBLIC_APP_URL!).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: `Reminder: ${task.activity}`,
        text: `Your task "${task.activity}" is starting soon.${task.description ? `\n\nDetails: ${task.description}` : ''}`
      })
    });

    if (!response.ok) {
      throw new Error(`Email service responded with ${response.status}`);
    }

    return {
      success: true,
      type: 'email',
      recipient: email
    };
  } catch (error) {
    console.error('Email notification failed:', error);
    return {
      success: false,
      type: 'email',
      recipient: email,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function sendSMSNotification(task: any, phoneNumber: string) {
  try {
    // Call your SMS endpoint
    const response = await fetch(new URL('/api/send-sms', process.env.NEXT_PUBLIC_APP_URL!).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: phoneNumber,
        message: `Reminder: Your task "${task.activity}" is starting soon.`,
        userId: task.userId // Include userId for premium check
      })
    });

    if (!response.ok) {
      throw new Error(`SMS service responded with ${response.status}`);
    }

    return {
      success: true,
      type: 'sms',
      recipient: phoneNumber
    };
  } catch (error) {
    console.error('SMS notification failed:', error);
    return {
      success: false,
      type: 'sms',
      recipient: phoneNumber,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function sendPushNotification(task: any, pushSubscription: any) {
  try {
    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify({
        title: `Reminder: ${task.activity} starts soon`,
        body: task.description || `Your task "${task.activity}" is starting soon.`,
        icon: '/icon.png',
        badge: '/badge.png',
        data: {
          url: '/',
          timestamp: new Date().toISOString(),
          type: 'task-reminder'
        }
      })
    );

    return {
      success: true,
      type: 'push',
      recipient: pushSubscription.endpoint
    };
  } catch (error) {
    console.error('Push notification failed:', error);
    // If push subscription is invalid, return special error
    if (error instanceof webpush.WebPushError && (error.statusCode === 410 || error.statusCode === 404)) {
      return {
        success: false,
        type: 'push',
        recipient: pushSubscription.endpoint,
        error: 'SUBSCRIPTION_INVALID'
      };
    }
    return {
      success: false,
      type: 'push',
      recipient: pushSubscription.endpoint,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function POST() {
  const now = new Date();
  const currentMinute = now.getMinutes();
  const currentHour = now.getHours();

  try {
    // Get all tasks for today
    const tasksRef = collection(db, 'tasks');
    const q = query(
      tasksRef,
      where('reminderSent', '==', false),
      where('date', '==', now.toISOString().split('T')[0])
    );
    
    const tasksSnapshot = await getDocs(q);
    const notifications = [];

    for (const taskDoc of tasksSnapshot.docs) {
      const task = taskDoc.data();
      const userPrefsRef = collection(db, 'userPreferences');
      const userPrefsSnap = await getDocs(query(userPrefsRef, where('userId', '==', task.userId)));
      
      if (userPrefsSnap.empty) continue;
      const userPrefsData = userPrefsSnap.docs[0].data();

      // Calculate notification time
      const taskHour = task.startTime;
      const reminderMinutes = userPrefsData.reminderTime || 10;
      
      let notificationHour = taskHour;
      let notificationMinute = 0;
      
      if (reminderMinutes >= 60) {
        notificationHour = taskHour - Math.floor(reminderMinutes / 60);
        notificationMinute = 60 - (reminderMinutes % 60);
      } else {
        notificationMinute = 60 - reminderMinutes;
        if (notificationMinute === 60) {
          notificationMinute = 0;
        } else {
          notificationHour = notificationHour - 1;
        }
      }

      // Check if it's time to send notification
      if (currentHour === notificationHour && currentMinute === notificationMinute) {
        const notificationPromises = [];

        if (userPrefsData.emailReminders) {
          notificationPromises.push(
            sendEmailNotification(task, userPrefsData.email)
          );
        }
        
        if (userPrefsData.smsReminders && userPrefsData.phoneNumber) {
          notificationPromises.push(
            sendSMSNotification(task, userPrefsData.phoneNumber)
          );
        }

        // Add push notification if enabled
        if (userPrefsData.pushReminders && userPrefsData.pushSubscription) {
          notificationPromises.push(
            sendPushNotification(task, userPrefsData.pushSubscription)
          );
        }

        // Wait for all notifications to be sent
        const results = await Promise.all(notificationPromises);

        // Check for invalid push subscriptions
        const invalidPushSubscription = results.find(
          result => result.type === 'push' && result.error === 'SUBSCRIPTION_INVALID'
        );

        // Update task and potentially user preferences
        const updates: any = { 
          reminderSent: true,
          lastUpdated: Timestamp.now()
        };

        await updateDoc(taskDoc.ref, updates);

        // If push subscription is invalid, update user preferences
        if (invalidPushSubscription) {
          await updateDoc(userPrefsSnap.docs[0].ref, {
            pushReminders: false,
            pushSubscription: null
          });
        }
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      notificationsSent: notifications.length 
    });
  } catch (error) {
    console.error('Error in notification function:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}