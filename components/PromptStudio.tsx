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
      // Get relevant context (exclude only fossil thoughts)
      let relevantContext: any[] = [];
      
      if (selectedTag && relatedThoughts.length > 0) {
        // Use selected tag context, excluding only fossils
        relevantContext = relatedThoughts
          .filter(t => t.status !== 'fossil') // Include all non-fossil thoughts
          .sort((a, b) => b.atp - a.atp)
          .slice(0, 6);
      } else {
        // Use all non-fossil thoughts, prioritizing higher ATP
        relevantContext = thoughts
          .filter(t => t.status !== 'fossil') // Include low-quality but not fossil
          .sort((a, b) => b.atp - a.atp)
          .slice(0, 10);
      }

      console.log('🧠 Enhancing prompt with', relevantContext.length, 'non-fossil thoughts');

      const response = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalPrompt,
          relevantThoughts: relevantContext.map(t => ({
            text: t.text,
            tags: t.tags,
            atp: t.atp,
            status: t.status
          }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✨ Prompt enhanced using', data.contextUsed, 'thoughts');
        setEnhancedPrompt(data.enhancedPrompt);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to enhance prompt');
      }
    } catch (error) {
      console.error('❌ Failed to enhance prompt:', error);
      // Intelligent fallback - include low-quality thoughts too
      const contextInsights = relatedThoughts.length > 0
        ? relatedThoughts.filter(t => t.status !== 'fossil').slice(0, 3)
        : thoughts.filter(t => t.status !== 'fossil').slice(0, 3);
      
      if (contextInsights.length > 0) {
        const insights = contextInsights.map(t => t.text).join(' ');
        setEnhancedPrompt(`${originalPrompt} Consider these relevant insights: ${insights}`);
      } else {
        setEnhancedPrompt(originalPrompt + ' (Note: No high-quality context available for enhancement)');
      }
    } finally {
      setIsEnhancing(false);
    }
  }, [originalPrompt, relatedThoughts, thoughts, selectedTag]);

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
          AI-powered prompt enhancement using Claude Opus & your active thoughts
        </p>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Selected Context Display */}
        {/* Context Quality Indicator */}
        <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-3">
          <h3 className="text-sm font-medium text-gray-300 mb-2">
            Available Context
          </h3>
          <div className="text-xs text-gray-400">
            {selectedTag ? (
              <div>
                <span className="text-purple-400">Selected Tag:</span> {selectedTagData?.name}
                <br />
                <span className="text-green-400">Available thoughts:</span> {relatedThoughts.filter(t => t.status !== 'fossil').length}
                <br />
                <span className="text-gray-500">Fossil thoughts:</span> {relatedThoughts.filter(t => t.status === 'fossil').length} (excluded)
              </div>
            ) : (
              <div>
                <span className="text-green-400">Available thoughts:</span> {thoughts.filter(t => t.status !== 'fossil').length}
                <br />
                <span className="text-gray-500">Fossil thoughts:</span> {thoughts.filter(t => t.status === 'fossil').length} (excluded)
              </div>
            )}
          </div>
        </div>

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
          <h3 className="text-sm font-medium text-gray-300 mb-2">Claude Opus Enhancement:</h3>
          <div className="text-xs text-gray-400 space-y-2">
            <div>• <span className="text-green-400">Smart Context Selection:</span> Only uses high-ATP, active thoughts (no fossils)</div>
            <div>• <span className="text-purple-400">Intelligent Integration:</span> Blends context naturally into your prompt</div>
            <div>• <span className="text-blue-400">Enhanced Reasoning:</span> Makes prompts more specific and actionable</div>
            <div className="pt-2 border-t border-gray-700 mt-3">
              <div className="font-medium text-gray-300">Usage:</div>
              <div>1. Optional: Select a semantic tag for focused context</div>
              <div>2. Write your basic prompt</div>
              <div>3. Let Claude Opus intelligently enhance it</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}