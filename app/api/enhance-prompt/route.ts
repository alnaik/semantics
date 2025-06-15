// app/api/enhance-prompt/route.ts
import { NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export async function POST(request: Request) {
  try {
    console.log('🧠 Smart Prompt Enhancement API called');
    const { originalPrompt, relevantThoughts = [] } = await request.json();
    console.log('📝 Original prompt:', originalPrompt);
    console.log('🧠 Relevant thoughts:', relevantThoughts.length);

    if (!ANTHROPIC_API_KEY) {
      console.error('❌ ANTHROPIC_API_KEY is not set');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Filter out fossil thoughts and select only high-quality, relevant context
    const activeThoughts = relevantThoughts.filter((t: any) => t.atp > 30 && t.status !== 'fossil');
    
    // Create rich context from active thoughts
    const contextInsights = activeThoughts.map((t: any) => 
      `• ${t.text} (Strength: ${Math.round(t.atp)})`
    ).join('\n');

    const enhancementPrompt = `You are an expert prompt engineer. Your task is to enhance a user's simple prompt by intelligently weaving in relevant context from their personal knowledge base to create a more sophisticated, nuanced, and effective prompt.

ORIGINAL PROMPT:
"${originalPrompt}"

RELEVANT CONTEXT FROM USER'S KNOWLEDGE:
${contextInsights}

ENHANCEMENT INSTRUCTIONS:
1. Analyze the original prompt's intent and desired outcome
2. Identify which pieces of context are most relevant and valuable
3. Seamlessly integrate the relevant insights into an enhanced version
4. Make the prompt more specific, detailed, and actionable
5. Maintain the user's original voice and intent
6. Add nuance and depth based on their personal context
7. Don't just append context - weave it naturally into the prompt structure

IMPORTANT:
- Don't mention "based on your previous thoughts" or reference the context explicitly
- Make it feel like a naturally evolved, more sophisticated version of their prompt
- Focus on quality over quantity - only use the most relevant context
- Keep the enhanced prompt concise but powerful
- Maintain the original prompt's core objective

Return ONLY the enhanced prompt, no explanation or meta-commentary.`;

    console.log('🚀 Sending request to Claude Opus...');
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-opus-20240229', // Using Opus for better prompt engineering
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: enhancementPrompt
          }
        ],
        temperature: 0.7 // Higher creativity for prompt enhancement
      })
    });

    console.log('📡 Claude Opus response status:', response.status);

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Claude Opus API error:', error);
      return NextResponse.json(
        { error: 'Failed to enhance prompt' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const enhancedPrompt = data.content[0].text;
    console.log('✨ Enhanced prompt created');
    
    return NextResponse.json({
      enhancedPrompt: enhancedPrompt.trim(),
      contextUsed: activeThoughts.length,
      originalPrompt
    });

  } catch (error) {
    console.error('❌ Error in Smart Prompt Enhancement:', error);
    return NextResponse.json(
      { error: 'Failed to process enhancement request' },
      { status: 500 }
    );
  }
}