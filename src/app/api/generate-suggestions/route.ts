import { OpenAI } from 'openai'
import { NextResponse } from 'next/server'

// Check if API key exists

let key = "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"
if (!key) {
  console.error('OPENAI_API_KEY is not set in environment variables')
}

const openai = new OpenAI({
  apiKey: key
})

export async function POST(request: Request) {
  try {
    // 1. Log request data
    const body = await request.json()
    console.log('Received historical tasks:', body.historicalTasks)

    if (!body.historicalTasks) {
      return NextResponse.json(
        { error: 'No historical tasks provided' },
        { status: 400 }
      )
    }

    if (!body.historicalTasks || body.historicalTasks.length === 0) {
      // Return default suggestions if no history
      return NextResponse.json([
        {
          activity: "Morning Planning Session",
          description: "Review and plan your day's priorities",
          startTime: 8,
          duration: 1,
          confidence: 90,
          reasoning: "Starting the day with planning helps increase productivity"
        },
        {
          activity: "Focus Work Block",
          description: "Dedicated time for your most important task",
          startTime: 9,
          duration: 2,
          confidence: 85,
          reasoning: "Peak productivity hours for most people are in the morning"
        },
        {
          activity: "Review & Wrap-up",
          description: "Review day's progress and plan for tomorrow",
          startTime: 16,
          duration: 1,
          confidence: 80,
          reasoning: "End-of-day review helps maintain productivity momentum"
        }
      ])
    }

    // 2. Prepare the prompt
    const prompt = `
      You are a productivity AI assistant. Based on these historical tasks:
      ${JSON.stringify(body.historicalTasks, null, 2)}

      Generate 3 suggested tasks for tomorrow. Format your response as a JSON object with this exact structure:
      {
        "suggestions": [
          {
            "activity": "Task name",
            "description": "Brief description",
            "startTime": 9,
            "duration": 2,
            "confidence": 85,
            "reasoning": "Why this task is suggested"
          }
        ]
      }

      Rules:
      - startTime must be between 0 and 23
      - duration must be between 1 and 4
      - confidence must be between 0 and 100
      - Keep descriptions concise
    `

    // 3. Make OpenAI request with error handling
    console.log('Sending request to OpenAI...')
    const completion = await openai.chat.completions.create({
      messages: [{ 
        role: "user", 
        content: prompt 
      }],
      model: "gpt-3.5-turbo", // Fallback to 3.5 if 4 isn't available
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

    // 6. Return successful response
    return NextResponse.json(parsedResponse.suggestions)

  } catch (error: any) {
    // 7. Detailed error logging
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
    })

    // 8. Return appropriate error response
    return NextResponse.json(
      { 
        error: 'Failed to generate suggestions',
        details: error.message 
      }, 
      { status: 500 }
    )
  }
} 