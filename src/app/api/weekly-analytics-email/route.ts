import { db } from '@/lib/firebase';
import { collection, query, getDocs, where, getDoc, doc } from 'firebase/firestore';
import { NextResponse } from 'next/server';


async function sendWeeklyAnalyticsEmail(email: string) {
  console.log('📧 Attempting weekly analytics email:', { email });
  try {
    const response = await fetch(new URL('/api/send-reminder', process.env.NEXT_PUBLIC_APP_URL as string || 'https://simple-r.vercel.app').toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: 'SimpleR: Weekly progress report',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>SimpleR Weekly Report</title>
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
                ">
                  <h1 style="
                    color: white;
                    margin: 0;
                    font-size: 24px;
                    font-weight: bold;
                  ">Weekly Progress Report</h1>
                </div>

                <!-- Main Content -->
                <div style="
                  background: white;
                  border-radius: 16px;
                  padding: 24px;
                  margin-bottom: 24px;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                ">
                  <p style="
                    color: #475569;
                    font-size: 16px;
                    margin-top: 0;
                  ">Hey there! 👋</p>
                  
                  <p style="color: #475569;">Hope you're having a great week! Just dropping by to remind you to check in on your progress.</p>

                  <div style="
                    background: #f1f5f9;
                    border-radius: 12px;
                    padding: 20px;
                    margin: 24px 0;
                  ">
                    <h2 style="
                      color: #1e293b;
                      margin-top: 0;
                      font-size: 18px;
                    ">📊 Your Analytics Dashboard</h2>
                    <p style="color: #475569; margin-bottom: 16px;">
                      Your personalized analytics dashboard is ready for review.
                    </p>
                    <a href="https://simple-r.vercel.app/analytics" 
                      style="
                        display: inline-block;
                        background: linear-gradient(to right, #8b5cf6, #7c3aed);
                        color: white;
                        text-decoration: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-weight: 600;
                      "
                    >View Dashboard</a>
                  </div>

                  <p style="
                    color: #475569;
                    font-style: italic;
                  ">Remember, every small step counts towards your bigger goals. Keep pushing forward! 🌟</p>
                </div>

                <!-- Footer -->
                <div style="
                  text-align: center;
                  color: #64748b;
                  font-size: 14px;
                ">
                  <p>Need to adjust your notification settings?<br>
                    <a href="https://simple-r.vercel.app/preferences" 
                      style="color: #8b5cf6; text-decoration: none;"
                    >Visit your preferences</a>
                  </p>
                  <p style="color: #94a3b8;">Have a productive week ahead! 💪</p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `Hey there! 👋\n\nHope you're having a great week! Just dropping by to remind you to check in on your progress.\n\nYour personalized analytics dashboard is ready for review:\nhttps://simple-r.vercel.app/analytics\n\nRemember, every small step counts towards your bigger goals. Keep pushing forward! 🌟\n\nNeed to adjust your notification settings?\nVisit: https://simple-r.vercel.app/preferences\n\nHave a productive week ahead! 💪`
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
  console.log('request url', request.url);

  try {
    // Verify Firebase ID token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Unauthorized - No valid auth token' 
      }, { status: 401 });
    }

    // const idToken = authHeader.split('Bearer ')[1];
    // await adminAuth.verifyIdToken(idToken); // Just verify admin access

    // Get all users with email reminders enabled
    const userPrefsQuery = query(
      collection(db, 'userPreferences'),
      where('emailReminders', '==', true)
    );
    const userPrefsSnapshot = await getDocs(userPrefsQuery);

    const results = [];
    
    // Process each user
    for (const userPref of userPrefsSnapshot.docs) {
      const userId = userPref.id;
      const userPrefs = userPref.data();

      if (!userPrefs.email) continue; // Skip if no email address

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

    
      const emailResult = await sendWeeklyAnalyticsEmail(userPrefs.email);
      results.push(emailResult);
      console.log('🏁 Weekly analytics email process completed for user:', userId);
    }

    return NextResponse.json({ 
      success: true, 
      results,
      totalProcessed: results.length 
    });

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