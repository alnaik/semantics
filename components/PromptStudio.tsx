// components/PromptStudio.tsx
'use client';

import { Thought } from '@/types';

interface PromptStudioProps {
  thoughts: Thought[];
  selectedThoughts: string[];
}

export default function PromptStudio({ thoughts, selectedThoughts }: PromptStudioProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="text-center text-gray-500 mt-8">
        <p>Prompt Studio coming soon...</p>
        <p className="text-sm mt-2">
          Selected thoughts: {selectedThoughts.length}
        </p>
      </div>
    </div>
  );
}