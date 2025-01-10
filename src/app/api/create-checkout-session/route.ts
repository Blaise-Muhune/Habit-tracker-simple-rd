import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

export async function POST(request: Request) {
  try {
    const { userId, plan, email } = await request.json()

    // Debug log environment variables
    console.log('Environment variables check:', {
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      hasMonthlyPrice: !!process.env.STRIPE_MONTHLY_PRICE_ID,
      hasYearlyPrice: !!process.env.STRIPE_YEARLY_PRICE_ID,
      hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
    })

    // Set price based on plan
    const priceId = plan === 'yearly' 
      ? process.env.STRIPE_YEARLY_PRICE_ID 
      : process.env.STRIPE_MONTHLY_PRICE_ID

    if (!priceId) {
      throw new Error(`Missing price ID for ${plan} plan`)
    }

    console.log('Creating checkout session with:', {
      priceId,
      plan,
      email,
      userId,
    })

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/premium`,
      customer_email: email,
      metadata: {
        userId,
        plan,
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    })

    if (!session?.id) {
      throw new Error('Failed to create checkout session')
    }

    return NextResponse.json({ sessionId: session.id })
  } catch (error: any) {
    console.error('Error creating checkout session:', error.message)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
} 