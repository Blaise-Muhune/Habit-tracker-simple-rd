'use client'

import React, { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { useAuth } from '@/context/AuthContext'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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

  const handleUpgrade = async () => {
    if (!user) {
      alert('Please sign in to upgrade')
      return
    }

    setIsLoading(true)
    try {
      const now = new Date()
      const nextMonth = new Date(now)
      nextMonth.setMonth(nextMonth.getMonth() + 1)

      await setDoc(doc(db, 'users', user.uid), {
        isPremium: true,
        premiumStartDate: now.toISOString(),
        nextBillingDate: nextMonth.toISOString(),
        premiumPlan: 'monthly'
      }, { merge: true })

      setPremiumStatus({
        isPremium: true,
        startDate: now.toISOString(),
        nextBillingDate: nextMonth.toISOString(),
        plan: 'monthly'
      })

      alert('Successfully upgraded to premium!')
      router.push('/')
    } catch (error) {
      console.error('Error upgrading:', error)
      alert('Failed to upgrade. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!user) {
      alert('Please sign in first')
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
        
        alert('Premium subscription cancelled successfully')
        router.push('/')
      } catch (error) {
        console.error('Error cancelling subscription:', error)
        alert('Failed to cancel subscription. Please try again.')
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
    <div className={`min-h-screen p-8 ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-[#F0F4FF]'}`}>
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <div className="mb-8">
          <Link
            href="/"
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-lg
              transition-colors duration-200
              ${theme === 'dark'
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }
            `}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Home
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className={`text-4xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Premium Experience
          </h1>
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
            <div
              key={index}
              className={`p-6 rounded-xl border-2
                ${theme === 'dark'
                  ? 'bg-slate-800/50 border-slate-700'
                  : 'bg-white/50 border-slate-200'
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
            </div>
          ))}
        </div>

        {/* Add Premium Status Component */}
        <PremiumStatus />

        {/* Modified Pricing Card */}
        <div className={`
          max-w-md mx-auto rounded-2xl border-2 overflow-hidden
          ${theme === 'dark'
            ? 'bg-slate-800/90 border-violet-500/20'
            : 'bg-white/90 border-violet-100'
          }
        `}>
          <div className="p-8">
            <div className="flex justify-between items-baseline mb-6">
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Premium
              </h2>
              <span className={`text-5xl font-bold ${theme === 'dark' ? 'text-violet-400' : 'text-violet-600'}`}>
                $9
                <span className={`text-lg ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  /mo
                </span>
              </span>
            </div>

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
                  'Upgrade Now'
                )}
              </button>
            )}

            <p className={`mt-4 text-center text-sm
              ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}
            `}>
              {premiumStatus.isPremium
                ? 'You currently have an active premium subscription'
                : 'Upgrade to unlock premium features'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PremiumPage 