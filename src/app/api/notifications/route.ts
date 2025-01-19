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
    const response = await fetch(new URL('/api/send-reminder', 'https://simple-r.vercel.app').toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: `Reminder: ${task.activity}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Task Reminder</title>
            </head>
            <body style="
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              margin: 0;
              padding: 0;
              background-color: #f8fafc;
            ">
              <div style="
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              ">
                <!-- Header -->
                <div style="
                  background: linear-gradient(to right, #8b5cf6, #3b82f6, #22d3ee);
                  padding: 32px 24px;
                  border-radius: 16px;
                  margin-bottom: 24px;
                  text-align: center;
                ">
                  <h1 style="
                    color: white;
                    margin: 0;
                    font-size: 24px;
                    font-weight: bold;
                  ">⏰ Task Reminder</h1>
                </div>

                <!-- Main Content -->
                <div style="
                  background: white;
                  border-radius: 16px;
                  padding: 24px;
                  margin-bottom: 24px;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                ">
                  <h2 style="
                    color: #1e293b;
                    margin-top: 0;
                    font-size: 20px;
                    text-align: center;
                  ">${task.activity}</h2>
                  
                  <div style="
                    background: #f1f5f9;
                    border-radius: 12px;
                    padding: 20px;
                    margin: 24px 0;
                  ">
                    <p style="
                      color: #475569;
                      margin: 0;
                      font-size: 16px;
                    ">
                      🕒 Starting in <strong>${reminderTime} minutes</strong>
                    </p>
                    ${task.description ? `
                      <p style="
                        color: #475569;
                        margin: 16px 0 0 0;
                        font-size: 16px;
                      ">
                        📝 <strong>Details:</strong> ${task.description}
                      </p>
                    ` : ''}
                  </div>

                  <!-- Motivation Section -->
                  <div style="
                    border-left: 4px solid #8b5cf6;
                    padding-left: 16px;
                    margin: 24px 0;
                  ">
                    <p style="
                      color: #475569;
                      font-style: italic;
                      margin: 0;
                    ">
                      "Remember why you started this task. Each step forward, no matter how small, brings you closer to your goals. You've got this! 💪"
                    </p>
                  </div>

                  <div style="text-align: center; margin-top: 24px;">
                    <a href="https://simple-r.vercel.app" 
                      style="
                        display: inline-block;
                        background: linear-gradient(to right, #8b5cf6, #7c3aed);
                        color: white;
                        text-decoration: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-weight: 600;
                      "
                    >View Task Details</a>
                  </div>
                </div>

                <!-- Quick Tips -->
                <div style="
                  background: #f8fafc;
                  border: 1px solid #e2e8f0;
                  border-radius: 12px;
                  padding: 16px;
                  margin-bottom: 24px;
                ">
                  <h3 style="
                    color: #1e293b;
                    margin: 0 0 12px 0;
                    font-size: 16px;
                  ">💡 Quick Tips:</h3>
                  <ul style="
                    color: #475569;
                    margin: 0;
                    padding-left: 20px;
                  ">
                    <li>Break your task into smaller, manageable steps</li>
                    <li>Remove distractions before starting</li>
                    <li>Take short breaks to maintain focus</li>
                  </ul>
                </div>

                <!-- Footer -->
                <div style="
                  text-align: center;
                  color: #64748b;
                  font-size: 14px;
                ">
                  <p style="margin: 0;">Want to change your reminder settings?</p>
                  <p style="margin: 8px 0;">
                    <a href="https://simple-r.vercel.app/preferences" 
                      style="color: #8b5cf6; text-decoration: none;"
                    >Update your preferences</a>
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `Reminder: ${task.activity} is starting in ${reminderTime} minutes. ${task.description ? `\n\nDetails: ${task.description}` : ''}. \n\n Remember why you started this task. Each step forward, no matter how small, brings you closer to your goals. You've got this! 💪 \n\nWant to change reminder type? Visit https://simple-r.vercel.app/preferences`
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

function calculateNotificationTime(startTime: number, reminderMinutes: number) {
  // Convert decimal time to hours and minutes
  const startHours = Math.floor(startTime);
  const startMinutes = Math.round((startTime % 1) * 60);
  
  // Calculate notification time by subtracting reminder minutes
  let notificationMinutes = startMinutes - reminderMinutes;
  let notificationHours = startHours;
  
  // Handle minute underflow
  if (notificationMinutes < 0) {
    notificationHours -= 1;
    notificationMinutes += 60;
  }
  
  return {
    hour: notificationHours,
    minute: notificationMinutes
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

    

      // Calculate notification time
      const { hour: notificationHour, minute: notificationMinute } = calculateNotificationTime(
        task.startTime,
        userPrefs.reminderTime || 10
      );

      console.log('📝 Processing task:', {
        taskId: taskDoc.id,
        activity: task.activity,
        startTime: task.startTime,
        userTimezone,
        userLocalTime: `${currentHour}:${currentMinute}`,
        notificationTime: `${notificationHour}:${notificationMinute}`
      });

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

      

      // Calculate notification time
      const { hour: notificationHour, minute: notificationMinute } = calculateNotificationTime(
        task.startTime,
        userPrefs.reminderTime || 10
      );
      console.log('📝 Processing task:', {
        taskId: taskDoc.id,
        activity: task.activity,
        startTime: task.startTime,
        userTimezone,
        userLocalTime: `${currentHour}:${currentMinute}`,
        notificationTime: `${notificationHour}:${notificationMinute}`
      });
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