// components/PromptStudio.tsx
'use client';

import { useState, useCallback } from 'react';
import { Thought, SemanticTag } from '@/types';
import { Copy, Sparkles, ArrowRight, CheckCircle } from 'lucide-react';

interface PromptStudioProps {
  thoughts: Thought[];
  semanticTags: SemanticTag[];
  selectedTag?: string | null;
}

export default function PromptStudio({ thoughts, semanticTags, selectedTag }: PromptStudioProps) {
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [enhancedPrompt, setEnhancedPrompt] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get the selected tag data and related thoughts
  const selectedTagData = selectedTag ? semanticTags.find(t => t.id === selectedTag) : null;
  const relatedThoughts = selectedTagData ? thoughts.filter(t => selectedTagData.thoughtIds.includes(t.id)) : [];

  const enhancePrompt = useCallback(async () => {
    if (!originalPrompt.trim()) return;
    
    setIsEnhancing(true);
    
    try {
      // Create context from high ATP thoughts
      const highATPThoughts = thoughts
        .filter(t => t.atp > 50)
        .sort((a, b) => b.atp - a.atp)
        .slice(0, 5);
      
      const context = relatedThoughts.length > 0 
        ? relatedThoughts.map(t => ({
            text: t.text,
            tags: t.tags,
            atp: t.atp
          }))
        : highATPThoughts.map(t => ({
            text: t.text,
            tags: t.tags,
            atp: t.atp
          }));

      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Enhance this prompt with relevant context from my thought graph:

Original Prompt: "${originalPrompt}"

Available Context from Thoughts:
${context.map((t, i) => `${i + 1}. "${t.text}" (Tags: ${t.tags.join(', ')}, ATP: ${t.atp.toFixed(0)})`).join('\n')}

Please create an enhanced version of the original prompt that incorporates relevant insights and context from these thoughts. Make it more specific, detailed, and actionable while maintaining the original intent.

Return only the enhanced prompt, no explanation.`,
          existingThoughts: []
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Extract enhanced prompt from the response
        const enhanced = data.summary || data.tags?.join(' ') || 'Enhancement failed';
        setEnhancedPrompt(enhanced);
      } else {
        throw new Error('Failed to enhance prompt');
      }
    } catch (error) {
      console.error('Failed to enhance prompt:', error);
      // Fallback enhancement
      const contextText = relatedThoughts.length > 0
        ? relatedThoughts.map(t => t.text).join('. ')
        : thoughts.slice(0, 3).map(t => t.text).join('. ');
      
      setEnhancedPrompt(`${originalPrompt}\n\nContext: ${contextText}`);
    } finally {
      setIsEnhancing(false);
    }
  }, [originalPrompt, relatedThoughts, thoughts]);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(enhancedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [enhancedPrompt]);

  return (
    <div className="h-full bg-gray-900 border-l border-gray-700 flex flex-col text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 bg-gray-800">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          Smart Prompt Studio
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Enhance your prompts with context from your thought graph
        </p>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Selected Context Display */}
        {selectedTag && (
          <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-3">
            <h3 className="text-sm font-medium text-purple-300 mb-2">
              Selected Tag: {selectedTagData?.name} ({relatedThoughts.length} thoughts)
            </h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {relatedThoughts.slice(0, 3).map(thought => (
                <div key={thought.id} className="text-xs text-purple-200 bg-purple-800/30 rounded p-2">
                  <div className="font-medium">{thought.text.slice(0, 100)}...</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-purple-300">ATP: {thought.atp.toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Original Prompt Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Original Prompt
          </label>
          <textarea
            value={originalPrompt}
            onChange={(e) => setOriginalPrompt(e.target.value)}
            placeholder="Enter your prompt here..."
            className="w-full h-24 p-3 bg-gray-800 border border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-white placeholder-gray-400"
          />
        </div>

        {/* Enhance Button */}
        <div className="flex justify-center">
          <button
            onClick={enhancePrompt}
            disabled={!originalPrompt.trim() || isEnhancing}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isEnhancing ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                Enhancing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Enhance Prompt
              </>
            )}
          </button>
        </div>

        {/* Flow Visualization */}
        {enhancedPrompt && (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>

            {/* Enhanced Prompt Display */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-300">
                  Enhanced Prompt
                </label>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition-colors"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={enhancedPrompt}
                onChange={(e) => setEnhancedPrompt(e.target.value)}
                className="w-full min-h-32 p-4 bg-gray-800 border border-gray-600 rounded-lg resize-y focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-white placeholder-gray-400 text-sm"
                placeholder="Enhanced prompt will appear here..."
              />
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-600">
          <h3 className="text-sm font-medium text-gray-300 mb-2">How to use:</h3>
          <ol className="text-xs text-gray-400 space-y-1">
            <li>1. Click semantic tags in the graph to select context</li>
            <li>2. Enter your original prompt</li>
            <li>3. Click "Enhance Prompt" to add relevant thought context</li>
            <li>4. Edit and copy the enhanced prompt</li>
          </ol>
        </div>
      </div>
    </div>
  );
}