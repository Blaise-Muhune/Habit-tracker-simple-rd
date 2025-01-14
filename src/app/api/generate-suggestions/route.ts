import { OpenAI } from 'openai'
import { NextResponse } from 'next/server'
import { SuggestedTask } from '@/types'
import { db } from '@/lib/firebase'
import { addDoc, collection, query, where, getDocs } from 'firebase/firestore'

// Check if API key exists

const key = process.env.OPENAI_API_KEY
if (!key) {
  console.error('OPENAI_API_KEY is not set in environment variables')
}

const openai = new OpenAI({
  apiKey: key
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Debug logging
    console.log('Request body:', {
      userId: body.userId,
      hasHistoricalTasks: !!body.historicalTasks,
      historicalTasksLength: body.historicalTasks?.length,
    })

    // Validate required fields with better error messages
    if (!body.userId) {
      console.log('Missing userId in request')
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    if (!body.historicalTasks) {
      console.log('Missing historicalTasks in request')
      return NextResponse.json(
        { error: 'historicalTasks is required' },
        { status: 400 }
      )
    }

    // If historicalTasks is empty, return default suggestions
    if (body.historicalTasks.length === 0) {
      console.log('Historical tasks array is empty, returning defaults')
      const defaultSuggestions = [
        {
          activity: "Morning Planning Session",
          description: "Review and plan your day's priorities",
          startTime: 8,
          duration: 1,
          confidence: 90,
          category: "Planning",
          completed: false,
          isPriority: false,
          date: new Date().toISOString().split('T')[0],
          createdAt: Date.now(),
          userId: body.userId
        },
        // ... other default suggestions ...
      ]

      // Store default suggestions in Firebase
      try {
        const suggestionsRef = collection(db, 'suggestions')
        await Promise.all(defaultSuggestions.map(suggestion => 
          addDoc(suggestionsRef, suggestion)
        ))
        console.log('Default suggestions stored in Firebase')
      } catch (fbError) {
        console.error('Failed to store default suggestions:', fbError)
      }

      return NextResponse.json(defaultSuggestions)
    }

    // Check Firebase for existing suggestions for today
    const today = new Date().toISOString().split('T')[0]
    try {
      const suggestionsRef = collection(db, 'suggestions')
      const q = query(
        suggestionsRef,
        where('date', '==', today),
        where('userId', '==', body.userId)
      )
      const querySnapshot = await getDocs(q)
      
      if (!querySnapshot.empty) {
        console.log('Found existing suggestions in Firebase')
        const existingSuggestions = querySnapshot.docs.map(doc => doc.data() as SuggestedTask)
        return NextResponse.json(existingSuggestions)
      }
    } catch (fbError) {
      console.error('Failed to query Firebase:', fbError)
      // Continue to OpenAI if Firebase query fails
    }

    // If no suggestions found in Firebase, continue with OpenAI request
    console.log('No existing suggestions found, generating new ones...')

    // 2. Prepare the prompt
    const prompt = `
      You are a productivity AI assistant. Based on these historical tasks:
      ${JSON.stringify(body.historicalTasks, null, 2)}

      Generate 12 suggested tasks for tomorrow. Format your response as a JSON object with this exact structure:
      {
        "suggestions": [
          {
            "activity": "Task name",
            "description": "Brief description",
            "startTime": number between 0-23,
            "duration": number between 1-4,
            "category": "optional category name"
          }
        ]
      }

      Rules:
      - activity should be clear and actionable
      - startTime must be between 0 and 23 (24-hour format)
      - duration must be between 1 and 4 hours
      - descriptions should be under 100 characters
      - base suggestions on patterns from historical tasks
    `

    // 3. Make OpenAI request with error handling
    console.log('Sending request to OpenAI...')
    const completion = await openai.chat.completions.create({
      messages: [{ 
        role: "user", 
        content: prompt 
      }],
      model: "gpt-4o", // Fallback to 3.5 if 4 isn't available
      response_format: { type: "json_object" },
      temperature: 0.7,
    })

    // 4. Log and validate response
    const responseContent = completion.choices[0].message.content
    console.log('OpenAI response:', responseContent)

    if (!responseContent) {
      throw new Error('Empty response from OpenAI')
    }

    // 5. Parse and validate JSON
    const parsedResponse = JSON.parse(responseContent)
    
    if (!parsedResponse.suggestions || !Array.isArray(parsedResponse.suggestions)) {
      throw new Error('Invalid response format from OpenAI')
    }

    // Validate each suggestion matches our interface
    const validatedSuggestions = parsedResponse.suggestions.map((suggestion: SuggestedTask): SuggestedTask => {
      if (
        typeof suggestion.activity !== 'string' ||
        typeof suggestion.startTime !== 'number' ||
        typeof suggestion.duration !== 'number' ||
        suggestion.startTime < 0 || 
        suggestion.startTime > 23
      ) {
        throw new Error('Invalid suggestion format')
      }

      return {
        activity: suggestion.activity,
        description: suggestion.description || '',
        startTime: suggestion.startTime,
        duration: suggestion.duration,
        completed: false,
        isPriority: false,
        date: new Date().toISOString().split('T')[0],
        createdAt: Date.now(),
        userId: body.userId,
        confidence: suggestion.confidence || 85,
        category: suggestion.category || 'General'
      }
    })

    // Store suggestions in Firebase
    try {
      const suggestionsRef = collection(db, 'suggestions')
      await Promise.all(validatedSuggestions.map((suggestion: SuggestedTask) => 
        addDoc(suggestionsRef, suggestion)
      ))
      console.log('Suggestions stored in Firebase')
    } catch (fbError) {
      console.error('Failed to store suggestions in Firebase:', fbError)
      // Continue execution even if Firebase storage fails
    }

    return NextResponse.json(validatedSuggestions)

  } catch (error: unknown) {
    // 7. Detailed error logging
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'Unknown error',
    })

    // 8. Return appropriate error response
    return NextResponse.json(
      { 
        error: 'Failed to generate suggestions',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
} 