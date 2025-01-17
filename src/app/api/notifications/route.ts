import { db } from '@/lib/firebase'; // Import regular Firebase client
import { Task } from '@/types';
import { collection, query, where, getDocs, updateDoc, getDoc, doc } from 'firebase/firestore';
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

async function sendEmailNotification(task: Task, email: string, reminderTime: number) {
  console.log('📧 Attempting email notification:', { taskId: task.id, email });
  try {
    // Call your email endpoint
    const response = await fetch(new URL('/api/send-reminder', 'https://simple-r.vercel.app').toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: `Reminder: ${task.activity}`,
        text: `Your task "${task.activity}" is starting in ${reminderTime} minutes. ${task.description ? `\n\nDetails: ${task.description}` : ''}. \n\n want to change reminder type? visit https://simple-r.vercel.app/preferences`
      })
    });

    if (!response.ok) {
      throw new Error(`Email service responded with ${response.status}`);
    }

    console.log('📧 Email notification sent successfully');
    return {
      success: true,
      type: 'email',
      recipient: email
    };
  } catch (error) {
    console.error('📧 Email notification failed:', { error, taskId: task.id, email });
    return {
      success: false,
      type: 'email',
      recipient: email,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function sendSMSNotification(task: Task, phoneNumber: string, reminderTime: number) {
  console.log('📱 Attempting SMS notification:', { taskId: task.id, phoneNumber });
  try {
    // Call your SMS endpoint
    const response = await fetch(new URL('/api/send-sms', 'https://simple-r.vercel.app').toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: phoneNumber,
        message: `Reminder: Your task "${task.activity}" is starting in ${reminderTime} minutes. ${task.description ? `\n\nDetails: ${task.description}` : ''}. \n\n want to change reminder type? visit https://simple-r.vercel.app/preferences`,
        userId: task.userId // Include userId for premium check
      })
    });

    if (!response.ok) {
      throw new Error(`SMS service responded with ${response.status}`);
    }

    console.log('📱 SMS notification sent successfully');
    return {
      success: true,
      type: 'sms',
      recipient: phoneNumber
    };
  } catch (error) {
    console.error('📱 SMS notification failed:', { error, taskId: task.id, phoneNumber });
    return {
      success: false,
      type: 'sms',
      recipient: phoneNumber,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function sendPushNotification(task: Task, pushSubscription: webpush.PushSubscription, reminderTime: number) {
  console.log('🔔 Attempting push notification:', { taskId: task.id, endpoint: pushSubscription.endpoint });
  try {
    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify({
        title: `Reminder: ${task.activity} starts soon`,
        body: task.description || `Your task "${task.activity}" is starting in ${reminderTime} minutes.`,
        icon: '/icon.png',
        badge: '/badge.png',
        data: {
          url: '/',
          timestamp: new Date().toISOString(),
          type: 'task-reminder'
        }
      })
    );

    console.log('🔔 Push notification sent successfully');
    return {
      success: true,
      type: 'push',
      recipient: pushSubscription.endpoint
    };
  } catch (error) {
    console.error('🔔 Push notification failed:', { 
      error, 
      taskId: task.id, 
      endpoint: pushSubscription.endpoint,
      statusCode: error instanceof webpush.WebPushError ? error.statusCode : undefined
    });
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

function getUserLocalTime(userTimezone: string) {
  // Get current UTC time
  const utcDate = new Date();
  
  // Convert to user's timezone
  const userDate = new Date(utcDate.toLocaleString('en-US', {
    timeZone: userTimezone
  }));
  
  return {
    hour: userDate.getHours(),
    minute: userDate.getMinutes(),
    date: userDate.toLocaleDateString('en-CA') // YYYY-MM-DD format
  };
}

export async function POST(request: Request) {
  console.log('request base url', request.url)
  console.log('🔄 POST request received');

  try {
    // Query all tasks that haven't sent reminders yet
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('reminderSent', '==', false)
    );

    const tasksSnapshot = await getDocs(tasksQuery);
    console.log('📊 Found tasks:', {
      count: tasksSnapshot.size,
      taskIds: tasksSnapshot.docs.map(doc => doc.id)
    });

    const results = [];
    for (const taskDoc of tasksSnapshot.docs) {
      const task = taskDoc.data();
      const userId = task.userId;

      // Get user preferences for this specific task
      const userPrefsDoc = await getDoc(doc(db, 'userPreferences', userId));
      if (!userPrefsDoc.exists()) {
        console.log('⚠️ Skipping task - no user preferences:', { taskId: taskDoc.id, userId });
        continue;
      }

      const userPrefs = userPrefsDoc.data();
      const userTimezone = userPrefs.timezone || 'UTC'; // Fallback to UTC if no timezone set

      // Get time in user's timezone
      const userTime = getUserLocalTime(userTimezone);
      const currentHour = userTime.hour;
      const currentMinute = userTime.minute;
      const userDate = userTime.date;

      // Skip if task date doesn't match user's current date
      if (task.date !== userDate) {
        console.log('⏭️ Skipping task - different date:', {
          taskId: taskDoc.id,
          taskDate: task.date,
          userDate
        });
        continue;
      }

      console.log('📝 Processing task:', {
        taskId: taskDoc.id,
        activity: task.activity,
        startTime: task.startTime,
        userTimezone,
        userLocalTime: `${currentHour}:${currentMinute}`
      });

      // Calculate notification time
      const notificationHour = task.startTime - 1;
      const notificationMinute = 60 - (userPrefs.reminderTime || 10);

      if (currentHour === notificationHour && currentMinute === notificationMinute) {
        console.log('🔔 Sending notifications for task:', taskDoc.id);

        const notificationResults = [];

        // Email notification
        if (userPrefs.emailReminders && userPrefs.email) {
          const emailResult = await sendEmailNotification(task as Task, userPrefs.email, userPrefs?.reminderTime);
          notificationResults.push(emailResult);
        }

        // SMS notification
        if (userPrefs.smsReminders && userPrefs.phoneNumber) {
          const smsResult = await sendSMSNotification(task as Task, userPrefs.phoneNumber, userPrefs?.reminderTime);
          notificationResults.push(smsResult);
        }

        // Push notification
        if (userPrefs.pushReminders && userPrefs.pushSubscription) {
          const pushResult = await sendPushNotification(task as Task, userPrefs.pushSubscription, userPrefs?.reminderTime);
          notificationResults.push(pushResult);
        }

        results.push({
          taskId: taskDoc.id,
          notifications: notificationResults
        });

        // Update task reminder status
        try {
          await updateDoc(doc(db, 'tasks', taskDoc.id), {
            reminderSent: true
          });
          console.log('✅ Task reminder status updated:', taskDoc.id);
        } catch (error) {
          console.error('❌ Failed to update task reminder status:', {
            taskId: taskDoc.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    console.log('🏁 Process completed:', {
      tasksProcessed: tasksSnapshot.size,
      notificationsSent: results.length
    });

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Critical error in POST handler:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function GET() {
  console.log('🔄 GET request received');

  try {
    // Query all tasks that haven't sent reminders yet
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('reminderSent', '==', false)
    );

    const tasksSnapshot = await getDocs(tasksQuery);
    console.log('📊 Found tasks:', {
      count: tasksSnapshot.size,
      taskIds: tasksSnapshot.docs.map(doc => doc.id)
    });

    const results = [];
    for (const taskDoc of tasksSnapshot.docs) {
      const task = taskDoc.data();
      const userId = task.userId;

      // Get user preferences for this specific task
      const userPrefsDoc = await getDoc(doc(db, 'userPreferences', userId));
      if (!userPrefsDoc.exists()) {
        console.log('⚠️ Skipping task - no user preferences:', { taskId: taskDoc.id, userId });
        continue;
      }

      const userPrefs = userPrefsDoc.data();
      const userTimezone = userPrefs.timezone || 'UTC'; // Fallback to UTC if no timezone set

      // Get time in user's timezone
      const userTime = getUserLocalTime(userTimezone);
      const currentHour = userTime.hour;
      const currentMinute = userTime.minute;
      const userDate = userTime.date;

      // Skip if task date doesn't match user's current date
      if (task.date !== userDate) {
        console.log('⏭️ Skipping task - different date:', {
          taskId: taskDoc.id,
          taskDate: task.date,
          userDate
        });
        continue;
      }

      console.log('📝 Processing task:', {
        taskId: taskDoc.id,
        activity: task.activity,
        startTime: task.startTime,
        userTimezone,
        userLocalTime: `${currentHour}:${currentMinute}`
      });

      // Calculate notification time
      const notificationHour = task.startTime - 1;
      const notificationMinute = 60 - (userPrefs.reminderTime || 10);

      if (currentHour === notificationHour && currentMinute === notificationMinute) {
        console.log('🔔 Sending notifications for task:', taskDoc.id);

        const notificationResults = [];

        // Email notification
        if (userPrefs.emailReminders && userPrefs.email) {
          const emailResult = await sendEmailNotification(task as Task, userPrefs.email, userPrefs?.reminderTime);
          notificationResults.push(emailResult);
        }

        // SMS notification
        if (userPrefs.smsReminders && userPrefs.phoneNumber) {
          const smsResult = await sendSMSNotification(task as Task, userPrefs.phoneNumber, userPrefs?.reminderTime);
          notificationResults.push(smsResult);
        }

        // Push notification
        if (userPrefs.pushReminders && userPrefs.pushSubscription) {
          const pushResult = await sendPushNotification(task as Task, userPrefs.pushSubscription, userPrefs?.reminderTime);
          notificationResults.push(pushResult);
        }

        results.push({
          taskId: taskDoc.id,
          notifications: notificationResults
        });

        // Update task reminder status
        try {
          await updateDoc(doc(db, 'tasks', taskDoc.id), {
            reminderSent: true
          });
          console.log('✅ Task reminder status updated:', taskDoc.id);
        } catch (error) {
          console.error('❌ Failed to update task reminder status:', {
            taskId: taskDoc.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    console.log('🏁 Process completed:', {
      tasksProcessed: tasksSnapshot.size,
      notificationsSent: results.length
    });

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Critical error in POST handler:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PATCH() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}