import { NextResponse } from 'next/server'
import { initAdmin } from '@/lib/firebase-admin'
import OpenAI from 'openai'
import { format, subDays } from 'date-fns'
import { Task } from '@/types'

const { db } = initAdmin()
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Configure for Vercel Cron
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes timeout
export const preferredRegion = 'iad1' // Optional: specify region
export const revalidate = 0

// This configures the cron schedule in Vercel
// Runs every Sunday at midnight
export const config = {
  schedule: '0 0 * * 0'
}

export async function GET() {
  console.log('🚀 Starting weekly task analysis')
  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get()
    console.log(`📊 Found ${usersSnapshot.docs.length} users to process`)
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id
      console.log(`\n👤 Processing user: ${userId}`)
      
      // Get tasks from the last 4 weeks for this user
      const fourWeeksAgo = subDays(new Date(), 28)
      console.log(`📅 Fetching tasks since: ${format(fourWeeksAgo, 'yyyy-MM-dd')}`)
      
      const tasksSnapshot = await db
        .collection('tasks')
        .where('userId', '==', userId)
        .where('createdAt', '>=', fourWeeksAgo.getTime())
        .get()

      const tasks = tasksSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id
      })) as Task[]
      
      console.log(`📝 Found ${tasks.length} tasks for analysis`)

      // Group tasks by day of week
      const tasksByDay = tasks.reduce((acc, task) => {
        if (task.day && !acc[task.day]) acc[task.day] = []
        if (task.day) acc[task.day].push(task)
        return acc
      }, {} as Record<string, Task[]>)

      console.log(`📊 Tasks grouped by days: ${Object.keys(tasksByDay).join(', ')}`)

      // Process each day's tasks with ChatGPT
      for (const [day, dayTasks] of Object.entries(tasksByDay)) {
        console.log(`\n🗓️ Processing ${day} with ${dayTasks.length} tasks`)
        
        const prompt = `
          Analyze these tasks for ${day}:
          ${JSON.stringify(dayTasks, null, 2)}

          Please identify:
          1. Common patterns in timing and activities
          2. Regular tasks that appear frequently
          3. Best time slots for specific activities
          4. Tasks that have high completion rates

          Return a JSON array of suggested tasks with this structure:
          {
            "suggestions": [
              {
                "activity": "string",
                "startTime": number (0-23.5),
                "duration": number,
                "description": "string",
                "confidence": number (0-1)
              }
            ]
          }

          Only include suggestions with confidence > 0.6
          Limit to 5 most relevant suggestions
          if user has little data or no data, suggest productive random tasks that are most likely to be completed and not time sensitive
        `

        console.log('🤖 Calling ChatGPT API...')
        const completion = await openai.chat.completions.create({
          model: "gpt-4-turbo-preview",
          messages: [
            { 
              role: "system", 
              content: "You are a task analysis AI that identifies patterns and makes scheduling suggestions. Return only valid JSON."
            },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" }
        })

        const analysis = JSON.parse(completion.choices[0].message.content || '{}')
        console.log('✨ ChatGPT Response:', analysis)

        // Save suggestions to Firebase
        const suggestions = analysis.suggestions.map((suggestion:Task) => ({
          ...suggestion,
          userId,
          day,
          createdAt: Date.now(),
          processed: false
        }))

        console.log(`💾 Saving ${suggestions.length} suggestions to Firebase`)
        
        // Save to suggestions collection
        const batch = db.batch()
        for (const suggestion of suggestions) {
          const suggestionRef = db.collection('taskSuggestions').doc()
          batch.set(suggestionRef, suggestion)
        }
        await batch.commit()
        console.log('✅ Suggestions saved successfully')
      }
    }

    console.log('\n🎉 Weekly task analysis completed successfully')
    return NextResponse.json({ 
      success: true, 
      message: 'Weekly task analysis completed' 
    })

  } catch (error) {
    console.error('❌ Weekly task analysis error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process weekly task analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 