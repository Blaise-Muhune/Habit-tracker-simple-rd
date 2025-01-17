'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { formatPhoneNumber } from '../../utils/formatPhoneNumber';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        const userCredential = await signUpWithEmail(email, password);
        const user = userCredential.user;
        if (phoneNumber) {
          const formattedPhone = formatPhoneNumber(phoneNumber);
          await setDoc(doc(db, 'userPreferences', user.uid), {
            phoneNumber: formattedPhone,
            userId: user.uid,
            email: email,
            emailReminders: true,
            smsReminders: false,
            pushReminders: false,
            reminderTime: 10,
            defaultView: 'today'
          });
        }
      } else {
        await signInWithEmail(email, password);
      }
      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 
      ${theme === 'dark' ? 'bg-[#0B1120]' : 'bg-[#F0F4FF]'}`}
    >
      <div className="fixed inset-0 bg-grid-pattern opacity-5" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full max-w-md p-8 rounded-2xl border-2 backdrop-blur-xl
          ${theme === 'dark'
            ? 'bg-slate-800/50 border-slate-700'
            : 'bg-white/50 border-slate-200'
          }
        `}
      >
        <div className="text-center mb-8">
          <h1 className={`text-3xl font-bold mb-2 tracking-tight
            ${theme === 'dark'
              ? 'bg-gradient-to-r from-violet-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent'
              : 'bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent'
            }`}
          >
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            {isSignUp 
              ? 'Sign up to start organizing your tasks'
              : 'Sign in to continue organizing your tasks'
            }
          </p>
        </div>

        {/* Google Sign In Button */}
        <button
          onClick={handleGoogleSignIn}
          className={`w-full py-3 px-4 rounded-xl mb-6 flex items-center justify-center gap-3
            transition-all duration-200 border-2
            ${theme === 'dark'
              ? 'bg-slate-800 border-slate-700 hover:bg-slate-700'
              : 'bg-white border-slate-200 hover:bg-slate-50'
            }
          `}
        >
          <img 
            src={'/google-icon.svg'} 
            alt="Google" 
            className="w-5 h-5"
            loading="lazy"
          />
          <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
            Continue with Google
          </span>
        </button>

        <div className="relative mb-6">
          <div className={`absolute inset-0 flex items-center
            ${theme === 'dark' ? 'text-slate-700' : 'text-slate-200'}
          `}>
            <div className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className={`px-2 ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
              <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                Or continue with email
              </span>
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className={`p-3 rounded-lg text-sm
              ${theme === 'dark'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-red-50 text-red-600'
              }
            `}>
              {error}
            </div>
          )}

          <div>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl outline-none transition-colors
                ${theme === 'dark'
                  ? 'bg-slate-800 text-white border-2 border-slate-700 focus:border-blue-500'
                  : 'bg-white text-slate-900 border-2 border-slate-200 focus:border-blue-500'
                }
              `}
              required
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl outline-none transition-colors
                ${theme === 'dark'
                  ? 'bg-slate-800 text-white border-2 border-slate-700 focus:border-blue-500'
                  : 'bg-white text-slate-900 border-2 border-slate-200 focus:border-blue-500'
                }
              `}
              required
            />
          </div>

          {isSignUp && (
            <div>
              <input
                type="tel"
                placeholder="Phone number (optional)"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl outline-none transition-colors
                  ${theme === 'dark'
                    ? 'bg-slate-800 text-white border-2 border-slate-700 focus:border-blue-500'
                    : 'bg-white text-slate-900 border-2 border-slate-200 focus:border-blue-500'
                  }
                `}
              />
              <p className={`mt-1 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Format: +1XXXXXXXXXX (optional)
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-xl font-medium
              transition-all duration-200 relative
              ${theme === 'dark'
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
              ${loading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Loading...</span>
              </div>
            ) : (
              isSignUp ? 'Create Account' : 'Sign In'
            )}
          </button>
        </form>

        <p className={`mt-6 text-sm text-center
          ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}
        `}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className={`font-medium
              ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}
            `}
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </motion.div>
    </div>
  );
} 