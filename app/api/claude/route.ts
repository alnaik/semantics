import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  const { text } = await request.json();
  
  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307', // Cheaper for hackathon
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Extract semantic tags and find connections from this thought. Be concise.
        
Thought: "${text}"

Return ONLY a JSON object like this:
{
  "tags": ["tag1", "tag2"],
  "keywords": ["keyword1", "keyword2"]
}`
      }]
    });
    
    // Grab the first content block
    const firstBlock = message.content[0];

    // **Solution: Check if the block is a TextBlock before accessing .text**
    if (firstBlock.type === 'text') {
      const result = JSON.parse(firstBlock.text);
      
      // TODO: Find related thoughts based on keywords
      const relatedThoughtIds: string[] = [];
      
      return Response.json({ 
        tags: result.tags,
        relatedThoughtIds 
      });
    } else {
      // Handle the case where the first block is not text, if necessary
      throw new Error("Expected a text block from the API, but got something else.");
    }

  } catch (error) {
    console.error('Claude API error:', error);
    // It's good practice to return a more specific error response
    return new Response(JSON.stringify({ error: "Failed to process request with AI model." }), { status: 500 });
  }
}