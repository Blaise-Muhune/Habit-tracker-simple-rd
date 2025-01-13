import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserPreferences as UserPreferencesType } from '@/types';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';

const UserPreferences = () => {
  const { user } = useAuth();
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const router = useRouter();
  const { theme } = useTheme();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;
      
      try {
        const prefsDoc = await getDoc(doc(db, 'userPreferences', user.uid));
        if (prefsDoc.exists()) {
          const prefs = prefsDoc.data() as UserPreferencesType;
          setPhoneNumber(prefs.phoneNumber || '');
          setSmsEnabled(prefs.smsReminders || false);
          setEmailEnabled(prefs.emailReminders ?? true);
        }

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        setIsPremiumUser(userDoc.data()?.isPremium || false);
        // Reset SMS preferences if user is not premium
        if (!isPremiumUser && smsEnabled) {
          setSmsEnabled(false);
          await setDoc(doc(db, 'userPreferences', user.uid), {
            smsReminders: false,
            phoneNumber: null
          }, { merge: true });
        }
      } catch (err) {
        console.error('Error loading preferences:', err);
        setError('Failed to load preferences');
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user, isPremiumUser]);

  const validatePhoneNumber = (number: string) => {
    // Basic validation for E.164 format
    const phoneRegex = /^\+[1-9]\d{10,14}$/;
    return phoneRegex.test(number);
  };

  const formatPhoneNumber = (number: string) => {
    // Remove all non-digit characters
    const digits = number.replace(/\D/g, '');
    
    // Add US country code if not present
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    return `+${digits}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      if (smsEnabled && !validatePhoneNumber(phoneNumber)) {
        throw new Error('Invalid phone number format. Please use +1XXXXXXXXXX format');
      }

      const preferences: UserPreferencesType = {
        userId: user.uid,
        phoneNumber: smsEnabled ? phoneNumber : null,
        smsReminders: smsEnabled,
        emailReminders: emailEnabled,
        reminderTime: 10, // Default 10 minutes
        email: user.email || '',
        defaultView: 'today'
      };

      await setDoc(doc(db, 'userPreferences', user.uid), preferences, { merge: true });
      setError('Preferences saved successfully!');
    } catch (err) {
      console.error('Error saving preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto p-6">
      <div className="space-y-4">
        <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Notification Preferences
        </h2>

        {/* Email Notifications */}
        <div className="flex items-center justify-between">
          <label className={`font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
            Email Notifications
          </label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={emailEnabled}
              onChange={(e) => setEmailEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* SMS Notifications */}
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className={`font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                SMS Notifications
              </label>
              <span className={`text-xs px-2 py-0.5 rounded-full
                ${theme === 'dark' 
                  ? 'bg-violet-500/20 text-violet-400' 
                  : 'bg-violet-100 text-violet-600'
                }`}
              >
                PRO
              </span>
            </div>
            <label className="relative inline-flex items-center">
              <input
                type="checkbox"
                checked={smsEnabled}
                onChange={(e) => {
                  if (!isPremiumUser) {
                    router.push('/premium');
                    return;
                  }
                  setSmsEnabled(e.target.checked);
                }}
                disabled={!isPremiumUser}
                className={`sr-only peer ${!isPremiumUser ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              />
              <div className={`w-11 h-6 rounded-full peer 
                after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                after:bg-white after:border-gray-300 after:border after:rounded-full 
                after:h-5 after:w-5 after:transition-all
                ${!isPremiumUser
                  ? theme === 'dark'
                    ? 'bg-gray-600 after:border-gray-600'
                    : 'bg-gray-300 after:border-gray-300'
                  : smsEnabled
                    ? 'bg-blue-600 after:translate-x-full after:border-white'
                    : theme === 'dark'
                      ? 'bg-gray-700 peer-focus:ring-blue-800'
                      : 'bg-gray-200 peer-focus:ring-blue-300'
                }
                peer-focus:outline-none peer-focus:ring-4`}
              />
            </label>
          </div>

          {/* Premium Upgrade Prompt - Now appears below the toggle */}
          {!isPremiumUser && (
            <div className={`mt-2 p-3 rounded-lg cursor-pointer
              ${theme === 'dark'
                ? 'bg-violet-500/10 hover:bg-violet-500/20'
                : 'bg-violet-50 hover:bg-violet-100'
              }`}
              onClick={() => router.push('/premium')}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
                <span className={`text-sm ${theme === 'dark' ? 'text-violet-400' : 'text-violet-600'}`}>
                  Upgrade to Pro to enable SMS notifications
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Phone Number Input - Only show if premium and SMS enabled */}
        {isPremiumUser && smsEnabled && (
          <div className="space-y-2">
            <label className={`block font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={handlePhoneChange}
              placeholder="+1XXXXXXXXXX"
              className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none
                ${theme === 'dark' 
                  ? 'bg-gray-800 border-gray-700 text-white' 
                  : 'bg-white border-gray-300'
                }`}
            />
            <p className="text-sm text-gray-500">
              Format: +1XXXXXXXXXX (US/Canada)
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className={`p-3 rounded-lg ${
          error.includes('success') 
            ? 'bg-green-100 text-green-700 dark:bg-green-800/30 dark:text-green-400'
            : 'bg-red-100 text-red-700 dark:bg-red-800/30 dark:text-red-400'
        }`}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors
          ${saving 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-500'
          } text-white`}
      >
        {saving ? 'Saving...' : 'Save Preferences'}
      </button>
    </form>
  );
};

export default UserPreferences; 