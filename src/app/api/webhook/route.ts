import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { headers } from 'next/headers'
import { db } from '@/lib/firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: Request) {
  const body = await request.text()
  const sig = await headers().get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
    console.log('Webhook event:', event)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const plan = session.metadata?.plan

        if (!userId || !plan) {
          throw new Error('Missing userId or plan in session metadata')
        }

        const now = new Date()
        const nextBillingDate = new Date()
        nextBillingDate.setMonth(nextBillingDate.getMonth() + (plan === 'yearly' ? 12 : 1))

        await setDoc(doc(db, 'users', userId), {
          isPremium: true,
          premiumStartDate: now.toISOString(),
          nextBillingDate: nextBillingDate.toISOString(),
          premiumPlan: plan,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
        }, { merge: true })

        console.log('Successfully activated premium for user:', userId)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userSnapshot = await getDoc(doc(db, 'users', subscription.metadata.userId))
        
        if (userSnapshot.exists()) {
          await setDoc(doc(db, 'users', subscription.metadata.userId), {
            isPremium: false,
            premiumStartDate: null,
            nextBillingDate: null,
            premiumPlan: null,
            stripeSubscriptionId: null,
          }, { merge: true })
          
          console.log('Successfully deactivated premium for user:', subscription.metadata.userId)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata.userId

        if (userId) {
          const nextBillingDate = new Date(subscription.current_period_end * 1000)
          
          await setDoc(doc(db, 'users', userId), {
            nextBillingDate: nextBillingDate.toISOString(),
            isPremium: subscription.status === 'active',
          }, { merge: true })

          console.log('Successfully updated subscription for user:', userId)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}