import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

// Create email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: "blaisemu007@gmail.com",
    pass: "txup cbhg qrik eueb", // Use app-specific password
  },
})

export async function POST(request: Request) {
  try {
    const { to, subject, text } = await request.json()

    // Validate email address
    if (!to || !to.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Send email
    await transporter.sendMail({
      from: `"Task Manager" <${"blaisemu007@gmail.com"}>`,
      to,
      subject,
      text,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
} 