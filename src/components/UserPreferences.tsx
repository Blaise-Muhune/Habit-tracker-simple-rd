import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserPreferences as UserPreferencesType } from '@/types';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';

const ToggleSwitch = ({ 
  enabled, 
  onChange, 
  disabled = false 
}: { 
  enabled: boolean; 
  onChange: (checked: boolean) => void; 
  disabled?: boolean;
}) => {
  const { theme } = useTheme();
  
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full
        transition-colors duration-200 ease-in-out focus:outline-none
        focus:ring-2 focus:ring-violet-500 focus:ring-offset-2
        ${disabled 
          ? theme === 'dark'
            ? 'bg-slate-700 cursor-not-allowed'
            : 'bg-slate-200 cursor-not-allowed'
          : enabled
            ? 'bg-violet-500'
            : theme === 'dark'
              ? 'bg-slate-700'
              : 'bg-slate-200'
        }
        ${theme === 'dark' ? 'focus:ring-offset-slate-800' : 'focus:ring-offset-white'}
      `}
    >
      <span
        className={`
          ${enabled ? 'translate-x-6' : 'translate-x-1'}
          inline-block h-4 w-4 transform rounded-full
          transition duration-200 ease-in-out
          ${disabled
            ? theme === 'dark'
              ? 'bg-slate-600'
              : 'bg-slate-300'
            : 'bg-white'
          }
        `}
      />
    </button>
  );
};

const UserPreferences = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  
  // All preferences state
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [defaultView, setDefaultView] = useState<'today' | 'schedule'>('today');
  const [reminderTime, setReminderTime] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Loading preferences timed out')), 10000);
        });

        const loadingPromise = (async () => {
          // Get premium status
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const isPremium = userDoc.data()?.isPremium || false;
          setIsPremiumUser(isPremium);

          // Get preferences
          const prefsDoc = await getDoc(doc(db, 'userPreferences', user.uid));
          if (prefsDoc.exists()) {
            const prefs = prefsDoc.data() as UserPreferencesType;
            setPhoneNumber(prefs.phoneNumber || '');
            setSmsEnabled(prefs.smsReminders || false);
            setEmailEnabled(prefs.emailReminders ?? true);
            setDefaultView(prefs.defaultView || 'today');
            setReminderTime(prefs.reminderTime || 10);
            setPushEnabled(prefs.pushReminders || false);
          }
        })();

        await Promise.race([loadingPromise, timeoutPromise]);
      } catch (err) {
        console.error('Error loading preferences:', err);
        setError(err instanceof Error ? err.message : 'Failed to load preferences');
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user]);

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

      // Get existing preferences first to preserve other fields
      const existingPrefsDoc = await getDoc(doc(db, 'userPreferences', user.uid));
      const existingPrefs = existingPrefsDoc.exists() ? existingPrefsDoc.data() : {};

      let currentSubscription = subscription;
      if (pushEnabled && !currentSubscription) {
        currentSubscription = await setupPushNotifications();
        if (!currentSubscription) {
          setPushEnabled(false);
        }
      }

      const serializedSubscription = currentSubscription ? {
        endpoint: currentSubscription.endpoint,
        keys: {
          p256dh: currentSubscription.toJSON().keys?.p256dh || '',
          auth: currentSubscription.toJSON().keys?.auth || ''
        }
      } : null;

      const preferences: UserPreferencesType = {
        ...existingPrefs, // Preserve existing fields
        userId: user.uid,
        phoneNumber: smsEnabled ? phoneNumber : null,
        smsReminders: smsEnabled,
        emailReminders: emailEnabled,
        pushReminders: pushEnabled,
        pushSubscription: serializedSubscription,
        reminderTime: reminderTime,
        email: user.email || '',
        defaultView: defaultView,
        // Preserve the tour status if it exists
        hasCompletedTour: existingPrefs.hasCompletedTour
      };

      await setDoc(doc(db, 'userPreferences', user.uid), preferences);
      setError('Preferences saved successfully!');
    } catch (err) {
      console.error('Error saving preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const setupPushNotifications = useCallback(async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push notifications are not supported by your browser');
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Register service worker with error handling
      let registration;
      try {
        registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready; // Wait for SW to be ready
      } catch (err) {
        console.error('Service Worker registration failed:', err);
        throw new Error('Failed to register service worker');
      }

      // Get existing subscription first
      try {
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          setSubscription(existingSub);
          setPushEnabled(true);
          return existingSub;
        }
      } catch (err) {
        console.error('Error checking existing subscription:', err);
      }

      // Create new subscription with error handling
      const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicVapidKey) {
        throw new Error('VAPID key not configured');
      }

      try {
        const newSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: publicVapidKey
        });

        setSubscription(newSubscription);
        setPushEnabled(true);
        return newSubscription;
      } catch (err) {
        console.error('Push subscription failed:', err);
        throw new Error('Failed to subscribe to push notifications');
      }
    } catch (error) {
      console.error('Error in setupPushNotifications:', error);
      setError(error instanceof Error ? error.message : 'Failed to enable push notifications');
      setPushEnabled(false);
      return null;
    }
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
      {/* Notification Settings */}
      <div className="space-y-4 sm:space-y-6">
        <h3 className={`text-base sm:text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center
              ${theme === 'dark' ? 'bg-violet-500/20' : 'bg-violet-50'}`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
                />
              </svg>
            </div>
            <span className="text-sm sm:text-base">Notifications</span>
          </div>
        </h3>
        
        <div className={`space-y-4 p-3 sm:p-4 rounded-lg sm:rounded-xl border
          ${theme === 'dark'
            ? 'bg-slate-800/50 border-slate-700'
            : 'bg-white border-slate-200'
          }`}
        >
          {/* Email Notifications */}
          <div className="flex items-start sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <label className={`block text-sm sm:text-base font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                Email Notifications
              </label>
              <p className={`mt-0.5 text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Receive task reminders via email
              </p>
            </div>
            <ToggleSwitch
              enabled={emailEnabled}
              onChange={setEmailEnabled}
            />
          </div>

          

          {/* Push Notifications - Moved here */}
          <div className="flex items-start sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <label className={`text-sm sm:text-base font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                  Push Notifications
                </label>
                <span className={`px-1.5 sm:px-2 py-0.5 text-xs font-medium rounded-full
                  ${theme === 'dark' 
                    ? 'bg-violet-500/20 text-violet-400' 
                    : 'bg-violet-100 text-violet-600'
                  }`}
                >
                  PRO
                </span>
              </div>
              <p className={`mt-0.5 text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Receive browser notifications for tasks
              </p>
            </div>
            <ToggleSwitch
              enabled={pushEnabled}
              onChange={async (checked) => {
                if (!isPremiumUser) {
                  router.push('/premium');
                  return;
                }
                if (checked) {
                  await setupPushNotifications();
                } else {
                  // Unsubscribe from push notifications
                  if (subscription) {
                    await subscription.unsubscribe();
                    await fetch('/api/push/unsubscribe', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        subscription,
                        userId: user?.uid
                      }),
                    });
                  }
                  setPushEnabled(false);
                  setSubscription(null);
                }
              }}
              disabled={!isPremiumUser}
            />
          </div>
          {/* SMS Notifications */}
          <div className="flex items-start sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <label className={`text-sm sm:text-base font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                  SMS Notifications
                </label>
                <span className={`px-1.5 sm:px-2 py-0.5 text-xs font-medium rounded-full
                  ${theme === 'dark' 
                    ? 'bg-violet-500/20 text-violet-400' 
                    : 'bg-violet-100 text-violet-600'
                  }`}
                >
                  PRO
                </span>
              </div>
              <p className={`mt-0.5 text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Get instant notifications via text message
              </p>
            </div>
            <ToggleSwitch
              enabled={smsEnabled}
              onChange={(checked) => {
                if (!isPremiumUser) {
                  router.push('/premium');
                  return;
                }
                setSmsEnabled(checked);
              }}
              disabled={!isPremiumUser}
            />
          </div>

          {/* Phone Number Input */}
          {isPremiumUser && smsEnabled && (
            <div className="space-y-1.5 sm:space-y-2">
              <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="+1XXXXXXXXXX"
                className={`w-full px-3 sm:px-4 py-2 rounded-lg border text-sm transition-colors
                  ${theme === 'dark' 
                    ? 'bg-slate-800 border-slate-600 text-white focus:border-violet-500' 
                    : 'bg-white border-gray-200 text-gray-900 focus:border-violet-500'
                  } focus:ring-1 focus:ring-violet-500 focus:outline-none`}
              />
            </div>
          )}
        </div>

        {/* Default View Section */}
        <h3 className={`text-base sm:text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center
              ${theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-50'}`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
            </div>
            <span className="text-sm sm:text-base">View Settings</span>
          </div>
        </h3>

        <div className={`space-y-4 p-3 sm:p-4 rounded-lg sm:rounded-xl border
          ${theme === 'dark'
            ? 'bg-slate-800/50 border-slate-700'
            : 'bg-white border-slate-200'
          }`}
        >
          {/* Settings Controls */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Default View */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                Default View
              </label>
              <select
                value={defaultView}
                onChange={(e) => setDefaultView(e.target.value as 'today' | 'schedule')}
                className={`w-full px-3 sm:px-4 py-2 rounded-lg border text-sm transition-colors
                  ${theme === 'dark'
                    ? 'bg-slate-800 border-slate-600 text-white focus:border-violet-500'
                    : 'bg-white border-gray-200 text-gray-900 focus:border-violet-500'
                  } focus:ring-1 focus:ring-violet-500 focus:outline-none`}
              >
                <option value="today">Today&apos;s Tasks</option>
                <option value="schedule">Full Schedule</option>
              </select>
            </div>

            {/* Reminder Time */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                Default Reminder Time
              </label>
              <select
                value={reminderTime}
                onChange={(e) => setReminderTime(Number(e.target.value))}
                className={`w-full px-3 sm:px-4 py-2 rounded-lg border text-sm transition-colors
                  ${theme === 'dark'
                    ? 'bg-slate-800 border-slate-600 text-white focus:border-violet-500'
                    : 'bg-white border-gray-200 text-gray-900 focus:border-violet-500'
                  } focus:ring-1 focus:ring-violet-500 focus:outline-none`}
              >
                <option value="1">1 minute before</option>
                <option value="2">2 minutes before</option>
                <option value="3">3 minutes before</option>
                <option value="4">4 minutes before</option>
                <option value="5">5 minutes before</option>
                <option value="6">6 minutes before</option>
                <option value="7">7 minutes before</option>
                <option value="8">8 minutes before</option>
                <option value="9">9 minutes before</option>
                <option value="10">10 minutes before</option>
                <option value="11">11 minutes before</option>
                <option value="12">12 minutes before</option>
                <option value="13">13 minutes before</option>
                <option value="14">14 minutes before</option>
                <option value="15">15 minutes before</option>
                <option value="16">16 minutes before</option>
                <option value="17">17 minutes before</option>
                <option value="18">18 minutes before</option>
                <option value="19">19 minutes before</option>
                <option value="20">20 minutes before</option>
                <option value="21">21 minutes before</option>
                <option value="22">22 minutes before</option>
                <option value="23">23 minutes before</option>
                <option value="24">24 minutes before</option>
                <option value="25">25 minutes before</option>
                <option value="26">26 minutes before</option>
                <option value="27">27 minutes before</option>
                <option value="28">28 minutes before</option>
                <option value="29">29 minutes before</option>
                <option value="30">30 minutes before</option>
                <option value="31">31 minutes before</option>
                <option value="32">32 minutes before</option>
                <option value="33">33 minutes before</option>
                <option value="34">34 minutes before</option>
                <option value="35">35 minutes before</option>
                <option value="36">36 minutes before</option>
                <option value="37">37 minutes before</option>
                <option value="38">38 minutes before</option>
                <option value="39">39 minutes before</option>
                <option value="40">40 minutes before</option>
                <option value="41">41 minutes before</option>
                <option value="42">42 minutes before</option>
                <option value="43">43 minutes before</option>
                <option value="44">44 minutes before</option>
                <option value="45">45 minutes before</option>
                <option value="46">46 minutes before</option>
                <option value="47">47 minutes before</option>
                <option value="48">48 minutes before</option>
                <option value="49">49 minutes before</option>
                <option value="50">50 minutes before</option>
                <option value="51">51 minutes before</option>
                <option value="52">52 minutes before</option>
                <option value="53">53 minutes before</option>
                <option value="54">54 minutes before</option>
                <option value="55">55 minutes before</option>
                <option value="56">56 minutes before</option>
                <option value="57">57 minutes before</option>
                <option value="58">58 minutes before</option>
                <option value="59">59 minutes before</option>
                <option value="60">60 minutes before</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className={`p-3 sm:p-4 rounded-lg sm:rounded-xl text-sm border
          ${error.includes('success')
            ? 'bg-green-500/10 text-green-500 border-green-500/20'
            : 'bg-red-500/10 text-red-500 border-red-500/20'
          }`}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className={`w-full px-4 py-2.5 sm:py-3 text-sm font-medium text-white rounded-lg sm:rounded-xl
          transition-colors bg-violet-500 hover:bg-violet-600 disabled:opacity-50
          disabled:cursor-not-allowed focus:outline-none focus:ring-2
          focus:ring-violet-500 focus:ring-offset-2
          ${theme === 'dark' ? 'focus:ring-offset-slate-800' : 'focus:ring-offset-white'}
        `}
      >
        {saving ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <span>Saving...</span>
          </div>
        ) : (
          'Save Preferences'
        )}
      </button>
    </form>
  );
};

export default UserPreferences; 