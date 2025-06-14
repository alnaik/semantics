// components/ThoughtCapture.tsx
'use client';

import { useState } from 'react';
import { Thought } from '@/types';

interface ThoughtCaptureProps {
  onAddThought: (text: string) => void;
  thoughts: Thought[];
}

export default function ThoughtCapture({ onAddThought, thoughts }: ThoughtCaptureProps) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onAddThought(input.trim());
      setInput('');
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getATPColor = (atp: number) => {
    if (atp > 70) return 'text-green-400';
    if (atp > 30) return 'text-yellow-400';
    if (atp > 10) return 'text-red-400';
    return 'text-gray-500';
  };

  const getStatusIcon = (thought: Thought) => {
    if (thought.status === 'fossil') return '🦴';
    if (thought.status === 'dying') return '⚠️';
    return '✨';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Input Form */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex flex-col gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg resize-none focus:outline-none focus:border-blue-500 text-white"
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Thought
            </button>
            <button
              type="button"
              onClick={() => setIsRecording(!isRecording)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isRecording 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title="Voice input (future feature)"
            >
              {isRecording ? '🔴' : '🎤'}
            </button>
          </div>
        </div>
      </form>

      {/* Thoughts List */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {thoughts.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>No thoughts yet. Start capturing your ideas!</p>
          </div>
        ) : (
          thoughts.map((thought) => (
            <div
              key={thought.id}
              className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
            >
              {/* Timestamp Header */}
              <div className="flex items-center justify-between mb-2 text-sm text-gray-400">
                <span>{formatTimestamp(thought.timestamp)}</span>
                <div className="flex items-center gap-2">
                  <span className={getATPColor(thought.atp)}>
                    ATP: {thought.atp.toFixed(0)}
                  </span>
                  <span>{getStatusIcon(thought)}</span>
                </div>
              </div>
              
              {/* Thought Text */}
              <p className="text-white mb-2">{thought.text}</p>
              
              {/* Tags */}
              {thought.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {thought.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-gray-700 text-xs rounded-full text-gray-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}