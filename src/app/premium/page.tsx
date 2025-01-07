'use client'

import React, { useState } from 'react'
import { useTheme } from 'next-themes'
import { useAuth } from '@/context/AuthContext'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useRouter } from 'next/navigation'

const PremiumPage = () => {
  const { theme } = useTheme()
  const { user } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleUpgrade = async () => {
    if (!user) {
      alert('Please sign in to upgrade')
      return
    }

    setIsLoading(true)
    try {
      await setDoc(doc(db, 'users', user.uid), {
        isPremium: true
      }, { merge: true })

      alert('Successfully upgraded to premium!')
      router.push('/')
    } catch (error) {
      console.error('Error upgrading:', error)
      alert('Failed to upgrade. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`min-h-screen p-8 ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-[#F0F4FF]'}`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className={`text-4xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Upgrade to Premium
          </h1>
          <p className={`text-lg ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Unlock advanced features and enhance your productivity
          </p>
        </div>

        {/* Premium Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {[
            {
              title: 'AI Task Suggestions',
              description: 'Get personalized task suggestions based on your activity patterns',
              icon: '🤖'
            },
            {
              title: 'Advanced Analytics',
              description: 'Gain insights into your productivity patterns',
              icon: '📊'
            },
            {
              title: 'Priority Support',
              description: 'Get faster responses to your support queries',
              icon: '⚡'
            },
            {
              title: 'Future Features',
              description: "Early access to new features as they're released",
              icon: '🎯'
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
              <div className="text-3xl mb-4">{feature.icon}</div>
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

        {/* Pricing Card */}
        <div className={`
          max-w-md mx-auto rounded-2xl border-2 overflow-hidden
          ${theme === 'dark'
            ? 'bg-slate-800/90 border-violet-500/20'
            : 'bg-white/90 border-violet-100'
          }
        `}>
          <div className="p-8">
            <div className="flex justify-between items-baseline mb-4">
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Premium Plan
              </h2>
              <span className={`text-5xl font-bold ${theme === 'dark' ? 'text-violet-400' : 'text-violet-600'}`}>
                $9
                <span className={`text-lg ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  /mo
                </span>
              </span>
            </div>
            
            <ul className="space-y-4 mb-8">
              {[
                'Access to AI Task Suggestions',
                'Advanced Analytics Dashboard',
                'Priority Customer Support',
                'Early Access to New Features'
              ].map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <svg
                    className={`w-5 h-5 ${theme === 'dark' ? 'text-violet-400' : 'text-violet-600'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            <button
              onClick={handleUpgrade}
              disabled={isLoading}
              className={`
                w-full py-4 rounded-xl font-semibold text-white
                transition-all duration-200 relative
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
          </div>
        </div>
      </div>
    </div>
  )
}

export default PremiumPage 