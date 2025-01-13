import twilio from 'twilio';
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

export async function POST(request: Request) {
  try {
    const { to, message, userId } = await request.json();

    if (!to || !message || !userId) {
      return NextResponse.json(
        { error: 'Phone number, message, and userId are required' },
        { status: 400 }
      );
    }

    // Check if user is premium using regular Firebase SDK
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();
    
    if (!userData?.isPremium) {
      return NextResponse.json(
        { error: 'SMS notifications are a premium feature' },
        { status: 403 }
      );
    }

    const response = await client.messages.create({
      body: message,
      from: twilioPhone,
      to: to
    });

    return NextResponse.json({ success: true, messageId: response.sid });
  } catch (error) {
    console.error('SMS sending error:', error);
    return NextResponse.json(
      { error: 'Failed to send SMS' },
      { status: 500 }
    );
  }
} 