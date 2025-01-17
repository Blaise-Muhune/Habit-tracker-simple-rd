'use client'

import React, { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { useAuth } from '@/context/AuthContext'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js'
import { Toast } from '@/components/Toast'
import { ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// Add this type for premium status
type PremiumStatus = {
  isPremium: boolean;
  startDate?: string;
  nextBillingDate?: string;
  plan?: 'monthly' | 'yearly';
}

const PremiumPage = () => {
  const { theme } = useTheme()
  const { user } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  // Update premium state to include more details
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus>({
    isPremium: false
  })
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly')
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null)

  useEffect(() => {
    const checkPremiumStatus = async () => {
      if (!user) return
      
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        const userData = userDoc.data()
        
        setPremiumStatus({
          isPremium: userData?.isPremium || false,
          startDate: userData?.premiumStartDate,
          nextBillingDate: userData?.nextBillingDate,
          plan: userData?.premiumPlan
        })
      } catch (error) {
        console.error('Error checking premium status:', error)
      }
    }

    checkPremiumStatus()
  }, [user])

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
  }

  const handleUpgrade = async () => {
    if (!user) {
      showToast('Please sign in to upgrade', 'info')
      return
    }

    setIsLoading(true)
    try {
      // Create Stripe Checkout Session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          plan: selectedPlan,
          email: user.email,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create checkout session')
      }

      const data = await response.json()
      
      // Get Stripe instance
      const stripe = await stripePromise
      if (!stripe) {
        throw new Error('Failed to load Stripe')
      }

      // Redirect to checkout
      const result = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      })

      if (result.error) {
        throw new Error(result.error.message)
      }
    } catch (error: unknown) {
      console.error('Error upgrading:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upgrade. Please try again.'
      showToast(errorMessage, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!user) {
      showToast('Please sign in first', 'info')
      return
    }

    if (confirm('Are you sure you want to cancel your premium subscription?')) {
      setIsLoading(true)
      try {
        await setDoc(doc(db, 'users', user.uid), {
          isPremium: false,
          premiumStartDate: null,
          nextBillingDate: null,
          premiumPlan: null
        }, { merge: true })

        setPremiumStatus({
          isPremium: false
        })
        
        showToast('Premium subscription cancelled successfully', 'success')
        router.push('/')
      } catch (error) {
        console.error('Error cancelling subscription:', error)
        showToast('Failed to cancel subscription. Please try again.', 'error')
      } finally {
        setIsLoading(false)
      }
    }
  }

  // Add this section in your JSX where appropriate (before the pricing card)
  const PremiumStatus = () => {
    if (!premiumStatus.isPremium) return null

    return (
      <div className={`
        max-w-md mx-auto mb-8 p-6 rounded-xl border-2
        ${theme === 'dark'
          ? 'bg-violet-500/10 border-violet-500/20'
          : 'bg-violet-50 border-violet-100'
        }
      `}>
        <h3 className={`text-lg font-semibold mb-4
          ${theme === 'dark' ? 'text-violet-400' : 'text-violet-600'}
        `}>
          Your Premium Status
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
              Plan
            </span>
            <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
              {premiumStatus.plan === 'yearly' ? 'Yearly' : 'Monthly'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
              Member since
            </span>
            <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
              {premiumStatus.startDate 
                ? new Date(premiumStatus.startDate).toLocaleDateString()
                : 'N/A'
              }
            </span>
          </div>
          <div className="flex justify-between">
            <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
              Next billing date
            </span>
            <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
              {premiumStatus.nextBillingDate 
                ? new Date(premiumStatus.nextBillingDate).toLocaleDateString()
                : 'N/A'
              }
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen p-4 sm:p-8 ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className={`text-3xl sm:text-4xl font-bold tracking-tight
            ${theme === 'dark'
              ? 'bg-gradient-to-r from-violet-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent'
              : 'bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent'
            }`}
          >
            Premium Experience
          </h1>
          <Link
            href="/"
            className={`p-2 sm:p-3 rounded-xl transition-all duration-300 border-2
              ${theme === 'dark'
                ? 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Link>
        </div>

        {/* Main Content */}
        <div className={`p-6 rounded-2xl border-2 backdrop-blur-xl
          ${theme === 'dark'
            ? 'bg-slate-800/50 border-slate-700'
            : 'bg-white/50 border-slate-200'
          }`}
        >
          {/* Description */}
          <div className={`mb-8 pb-6 border-b
            ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}
          >
            <p className={`text-lg ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Enhance your productivity with advanced features
            </p>
          </div>

          {/* Premium Features Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {[
              {
                title: 'Smart AI Assistant',
                description: 'Personalized task recommendations powered by AI',
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                )
              },
              {
                title: 'Advanced Analytics',
                description: 'Comprehensive insights and performance metrics',
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                )
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-6 rounded-xl border-2
                  ${theme === 'dark'
                    ? 'bg-slate-800/90 border-slate-700'
                    : 'bg-white/90 border-slate-200'
                  }
                `}
              >
                <div className={`mb-4 ${theme === 'dark' ? 'text-violet-400' : 'text-violet-600'}`}>
                  {feature.icon}
                </div>
                <h3 className={`text-xl font-semibold mb-2
                  ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}
                >
                  {feature.title}
                </h3>
                <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Premium Status Component */}
          <PremiumStatus />

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Monthly Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`
                rounded-xl border-2 overflow-hidden
                ${selectedPlan === 'monthly' ? 'ring-2 ring-violet-500' : ''}
                ${theme === 'dark'
                  ? 'bg-slate-800/90 border-slate-700'
                  : 'bg-white/90 border-slate-200'
                }
              `}
            >
              <div className="p-8">
                <div className="flex justify-between items-baseline mb-6">
                  <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Monthly
                  </h2>
                  <span className={`text-5xl font-bold ${theme === 'dark' ? 'text-violet-400' : 'text-violet-600'}`}>
                    $9
                    <span className={`text-lg ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      /mo
                    </span>
                  </span>
                </div>
                <button
                  onClick={() => setSelectedPlan('monthly')}
                  className={`
                    w-full py-4 rounded-xl font-semibold
                    transition-all duration-200
                    ${selectedPlan === 'monthly'
                      ? 'bg-gradient-to-r from-violet-600 to-violet-400 text-white'
                      : theme === 'dark'
                        ? 'bg-slate-700 text-slate-300'
                        : 'bg-slate-100 text-slate-600'
                    }
                  `}
                >
                  Select Monthly
                </button>
              </div>
            </motion.div>

            {/* Annual Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`
                rounded-xl border-2 overflow-hidden
                ${selectedPlan === 'yearly' ? 'ring-2 ring-violet-500' : ''}
                ${theme === 'dark'
                  ? 'bg-slate-800/90 border-slate-700'
                  : 'bg-white/90 border-slate-200'
                }
              `}
            >
              <div className="p-8">
                <div className="flex justify-between items-baseline mb-6">
                  <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Yearly
                  </h2>
                  <div className="text-right">
                    <span className={`text-5xl font-bold ${theme === 'dark' ? 'text-violet-400' : 'text-violet-600'}`}>
                      $7.50
                      <span className={`text-lg ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        /mo
                      </span>
                    </span>
                    <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      $90/year
                    </div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                      Save 17%
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPlan('yearly')}
                  className={`
                    w-full py-4 rounded-xl font-semibold
                    transition-all duration-200
                    ${selectedPlan === 'yearly'
                      ? 'bg-gradient-to-r from-violet-600 to-violet-400 text-white'
                      : theme === 'dark'
                        ? 'bg-slate-700 text-slate-300'
                        : 'bg-slate-100 text-slate-600'
                    }
                  `}
                >
                  Select Yearly
                </button>
              </div>
            </motion.div>
          </div>

          {/* Action Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {premiumStatus.isPremium ? (
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className={`
                  w-full py-4 rounded-xl font-semibold
                  transition-all duration-200
                  ${isLoading ? 'cursor-not-allowed opacity-80' : ''}
                  ${theme === 'dark'
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                  }
                `}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </div>
                ) : (
                  'Cancel Subscription'
                )}
              </button>
            ) : (
              <button
                onClick={handleUpgrade}
                disabled={isLoading}
                className={`
                  w-full py-4 rounded-xl font-semibold text-white
                  transition-all duration-200
                  ${isLoading ? 'cursor-not-allowed opacity-80' : ''}
                  bg-gradient-to-r from-violet-600 to-violet-400
                  hover:from-violet-500 hover:to-violet-300
                  active:from-violet-700 active:to-violet-500
                `}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </div>
                ) : (
                  `Upgrade to ${selectedPlan === 'yearly' ? 'Yearly' : 'Monthly'} Plan`
                )}
              </button>
            )}
          </motion.div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

export default PremiumPage 