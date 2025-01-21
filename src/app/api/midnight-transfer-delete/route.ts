import { HistoricalTask, Task, UserPreferences } from "@/types";
import { getDocs, doc, writeBatch, collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, toZonedTime } from "date-fns-tz";
import { addDays } from "date-fns";

export const GET = async () => {
    console.log('🚀 Starting midnight transition process');

    try {
        // Get all user preferences to check their timezones
        const userPreferences = query(collection(db, 'userPreferences'));
        const userPreferencesSnapshot = await getDocs(userPreferences);
        const userPreferencesData = userPreferencesSnapshot.docs.map(doc => ({
            ...(doc.data() as UserPreferences),
            id: doc.id
        }));

        console.log(`📋 Found ${userPreferencesData.length} users to process`);

        for (const userPreference of userPreferencesData) {
            const userId = userPreference.userId;
            const userEmail = userPreference.email;
            const userTimezone = userPreference.timezone || 'UTC'; // Default to UTC if no timezone set
            
            // Get current time in user's timezone
            const userCurrentTime = toZonedTime(new Date(), userTimezone);
            
            // Only process if it's midnight (00:00) in the user's timezone
            const userHour = format(userCurrentTime, 'HH', { timeZone: userTimezone });
            const userMinute = format(userCurrentTime, 'mm', { timeZone: userTimezone });
            
            console.log(`👤 Processing user ${userId} (${userEmail}):`);
            console.log(`   Timezone: ${userTimezone}`);
            console.log(`   Local time: ${userHour}:${userMinute}`);

            // Skip if it's not midnight in user's timezone (allowing for some buffer)
            if (userHour !== '00' || parseInt(userMinute) > 5) {
                console.log(`   ⏭️  Skipping: Not midnight in user's timezone`);
                continue;
            }

            console.log(`   ✅ Midnight detected, processing tasks...`);

            // Get yesterday's date in user's timezone
            const yesterday = format(
                addDays(userCurrentTime, -1),
                'yyyy-MM-dd',
                { timeZone: userTimezone }
            );

            // Query yesterday's tasks to store in history
            const yesterdayQuery = query(
                collection(db, 'tasks'),
                where('userId', '==', userId),
                where('date', '==', yesterday)
            );
            const yesterdaySnapshot = await getDocs(yesterdayQuery);
            console.log(`   📦 Found ${yesterdaySnapshot.size} tasks from yesterday`);
            
            // Batch operations
            const batch = writeBatch(db);
            
            // Store yesterday's tasks in history
            yesterdaySnapshot.docs.forEach(docSnapshot => {
                const taskData = docSnapshot.data() as Task;
                const historyRef = doc(db, 'taskHistory');
                
                batch.set(historyRef, {
                    ...taskData,
                    originalDate: yesterday,
                    actualDate: yesterday,
                    archivedAt: Date.now()
                } as HistoricalTask);
                
                // Delete the task from main collection
                batch.delete(docSnapshot.ref);
            });
            
            // Get today's date in user's timezone
            const today = format(userCurrentTime, 'yyyy-MM-dd', { timeZone: userTimezone });
            
            // Move tomorrow's tasks to today
            const oldTomorrowQuery = query(
                collection(db, 'tasks'),
                where('userId', '==', userId),
                where('date', '==', yesterday) // This was "tomorrow" yesterday
            );
            const tomorrowSnapshot = await getDocs(oldTomorrowQuery);
            console.log(`   📅 Found ${tomorrowSnapshot.size} tasks to move to today`);
            
            tomorrowSnapshot.docs.forEach(docSnapshot => {
                const taskData = docSnapshot.data() as Task;
                const newTodayRef = collection(db, 'tasks');
                batch.set(doc(newTodayRef), {
                    ...taskData,
                    date: today,
                    completed: false,
                    day: format(userCurrentTime, 'EEEE').toLowerCase() // Update day of week
                });
                
                batch.delete(docSnapshot.ref);
            });

            // Delete all suggestions when it's midnight for any user
            const suggestionsQuery = query(collection(db, 'suggestions'));
            const suggestionsSnapshot = await getDocs(suggestionsQuery);
            console.log(`   🗑️  Clearing ${suggestionsSnapshot.size} suggestions`);
            
            suggestionsSnapshot.docs.forEach(docSnapshot => {
                batch.delete(docSnapshot.ref);
            });

            // Execute all operations
            await batch.commit();
            console.log(`   ✨ Successfully processed midnight transition for user ${userId}`);
        }

        console.log('🎉 Midnight transition process completed successfully');
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('❌ Error during midnight transition:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};