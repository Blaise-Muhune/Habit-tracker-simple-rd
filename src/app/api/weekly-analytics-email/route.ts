import { adminAuth } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, where, getDoc, doc } from 'firebase/firestore';
import { NextResponse } from 'next/server';

interface WeeklyAnalyticsData {
  completedTasks: number;
  totalTasks: number;
  completionRate: string;
  // Add any other analytics fields from analyticsData here
}

async function sendWeeklyAnalyticsEmail(email: string, userData: WeeklyAnalyticsData) {
  console.log('📧 Attempting weekly analytics email:', { email });
  try {
    const response = await fetch(new URL('/api/send-reminder', 'https://simple-r.vercel.app').toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: 'Your Weekly Progress Report',
        text: `Hey there! 👋

It's time for your weekly progress check-in! 

Check out your analytics dashboard to see how you're doing:
https://simple-r.vercel.app/analytics

This week's summary:
- Completed Tasks: ${userData.completedTasks || 0}
- Total Tasks Created: ${userData.totalTasks || 0}
- Completion Rate: ${userData.completionRate || '0%'}

Keep up the great work! 💪

Want to change your notification preferences? Visit:
https://simple-r.vercel.app/preferences`
      })
    });

    if (!response.ok) {
      throw new Error(`Email service responded with ${response.status}`);
    }

    console.log('📧 Weekly analytics email sent successfully');
    return { success: true, recipient: email };
  } catch (error) {
    console.error('📧 Weekly analytics email failed:', { error, email });
    return {
      success: false,
      recipient: email,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function GET(request: Request) {

  console.log('🔄 Weekly analytics email job started');

  try {

    const {searchParams} = new URL(request.url);
    const key = searchParams.get('cron-key');
    if (key !== process.env.CRON_SECRET) {
      return NextResponse.json({ 
        error: 'Unauthorized - Invalid cron key' 
      }, { status: 401 });
    }
    // Verify Firebase ID token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Unauthorized - No valid auth token' 
      }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Get user preferences
    const userPrefDoc = await getDoc(doc(db, 'userPreferences', userId));
    if (!userPrefDoc.exists() || !userPrefDoc.data().email || !userPrefDoc.data().emailReminders) {
      return NextResponse.json({ 
        error: 'User has not enabled email reminders' 
      }, { status: 400 });
    }

    const userPrefs = userPrefDoc.data();

    // Get user's analytics data
    const analyticsDoc = await getDoc(doc(db, 'analytics', userId));
    const analyticsData = analyticsDoc.exists() ? analyticsDoc.data() : {};

    // Calculate weekly stats
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('userId', '==', userId),
      where('createdAt', '>=', weekStart.toISOString())
    );

    const tasksSnapshot = await getDocs(tasksQuery);
    const completedTasks = tasksSnapshot.docs.filter(doc => doc.data().completed).length;
    const totalTasks = tasksSnapshot.size;
    const completionRate = totalTasks > 0 ? `${((completedTasks / totalTasks) * 100).toFixed(1)}%` : '0%';

    const userData = {
      ...analyticsData,
      completedTasks,
      totalTasks,
      completionRate
    };

    const emailResult = await sendWeeklyAnalyticsEmail(userPrefs.email, userData);
    console.log('🏁 Weekly analytics email process completed for user:', userId);

    return NextResponse.json({ success: true, result: emailResult });

  } catch (error) {
    console.error('💥 Critical error in weekly analytics email:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 