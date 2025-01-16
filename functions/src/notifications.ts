import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import * as twilio from 'twilio';
import * as nodemailer from 'nodemailer';

// Add this type definition at the top of the file
type Config = {
  twilio: {
    account_sid: string;
    auth_token: string;
    phone_number: string;
  };
  email: {
    user: string;
    pass: string;
  };
};

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Initialize Twilio
const twilioClient = new twilio.Twilio(
  (functions.config() as Config).twilio.account_sid,
  (functions.config() as Config).twilio.auth_token
);

// Initialize Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().email?.user || '',
    pass: functions.config().email?.pass || '',
  },
});

interface NotificationAttempt {
  taskId: string;
  type: 'email' | 'sms';
  status: 'success' | 'failed';
  timestamp: number;
  error?: string;
}

export const checkAndSendNotifications = functions.scheduler.onSchedule('every 1 hours', async (_context: functions.scheduler.ScheduledEvent) => {
    const now = new Date();
    const batch = db.batch();
    const notificationPromises: Promise<NotificationAttempt>[] = [];
    
    try {
      // Get all tasks for the next hour
      const tasksSnapshot = await db
        .collection('tasks')
        .where('reminderSent', '==', false)
        .where('date', '==', now.toISOString().split('T')[0]) // Only today's tasks
        .get();

      for (const taskDoc of tasksSnapshot.docs) {
        const task = taskDoc.data();
        const userPrefsDoc = await db
          .collection('userPreferences')
          .doc(task.userId)
          .get();
        
        const userPrefs = userPrefsDoc.data();
        if (!userPrefs) continue;

        // Calculate reminder time
        const [year, month, day] = task.date.split('-').map(Number);
        const taskDate = new Date(year, month - 1, day);
        taskDate.setHours(task.startTime);
        const reminderTime = new Date(
          taskDate.getTime() - (userPrefs.reminderTime || 10) * 60000
        );

        // Check if reminder time falls within the current hour
        const hourStart = new Date(now);
        hourStart.setMinutes(0, 0, 0);
        const hourEnd = new Date(hourStart);
        hourEnd.setHours(hourStart.getHours() + 1);

        if (reminderTime >= hourStart && reminderTime < hourEnd) {
          // Send notifications based on user preferences
          if (userPrefs.emailReminders) {
            notificationPromises.push(
              sendEmailNotification(task, userPrefs.email)
                .then(() => ({
                  taskId: taskDoc.id,
                  type: 'email' as const,
                  status: 'success' as const,
                  timestamp: Date.now(),
                }))
                .catch(error => ({
                  taskId: taskDoc.id,
                  type: 'email' as const,
                  status: 'failed' as const,
                  timestamp: Date.now(),
                  error: error.message,
                }))
            );
          }

          if (userPrefs.smsReminders && userPrefs.phoneNumber) {
            notificationPromises.push(
              sendSMSNotification(task, userPrefs.phoneNumber)
                .then(() => ({
                  taskId: taskDoc.id,
                  type: 'sms' as const,
                  status: 'success' as const,
                  timestamp: Date.now(),
                }))
                .catch(error => ({
                  taskId: taskDoc.id,
                  type: 'sms' as const,
                  status: 'failed' as const,
                  timestamp: Date.now(),
                  error: error.message,
                }))
            );
          }

          // Mark task as notified
          batch.update(taskDoc.ref, { reminderSent: true });
        }
      }

      // Execute all notifications and batch updates
      const notificationResults = await Promise.all(notificationPromises);
      await batch.commit();

      // Log notification attempts
      await logNotificationAttempts(notificationResults);

      return { success: true, notificationsSent: notificationResults.length };
    } catch (error) {
      console.error('Error in notification function:', error);
      return { success: false, error: (error as Error).message };
    }
  });

async function sendEmailNotification(task: any, email: string): Promise<void> {
  const mailOptions = {
    from: functions.config().email.user,
    to: email,
    subject: `Reminder: ${task.activity} starting soon`,
    html: `
      <h2>Task Reminder</h2>
      <p>Your task "${task.activity}" starts in ${task.reminderTime || 10} minutes.</p>
      <p><strong>Time:</strong> ${formatTime(task.startTime)}</p>
      ${task.description ? `<p><strong>Description:</strong> ${task.description}</p>` : ''}
    `,
  };

  await transporter.sendMail(mailOptions);
}

async function sendSMSNotification(task: any, phoneNumber: string): Promise<void> {
  await twilioClient.messages.create({
    body: `Reminder: "${task.activity}" starts in ${task.reminderTime || 10} minutes at ${formatTime(task.startTime)}`,
    to: phoneNumber,
    from: functions.config().twilio.phone_number,
  });
}

async function logNotificationAttempts(attempts: NotificationAttempt[]): Promise<void> {
  const batch = db.batch();
  
  attempts.forEach(attempt => {
    const logRef = db.collection('notificationHistory').doc();
    batch.set(logRef, attempt);
  });

  await batch.commit();
}

function formatTime(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:00 ${period}`;
}
