// app/page.tsx - Main application layout
import { useState, useEffect } from 'react';
import ThoughtCapture from '@/components/ThoughtCapture';
import LivingGraph from '@/components/LivingGraph';
import PromptStudio from '@/components/PromptStudio';
import { Thought } from '@/types';
import { updateMetabolism } from '@/lib/metabolic';

export default function MetabolicMemory() {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [selectedThoughts, setSelectedThoughts] = useState<string[]>([]);

  // Metabolic decay timer
  useEffect(() => {
    const interval = setInterval(() => {
      setThoughts(prev => updateMetabolism(prev));
    }, 5000); // Every 5 seconds for demo

    return () => clearInterval(interval);
  }, []);

  const addThought = async (text: string) => {
    const newThought: Thought = {
      id: Date.now().toString(),
      text,
      timestamp: Date.now(),
      tags: [],
      atp: 100,
      connections: [],
      status: 'active'
    };

    setThoughts(prev => [newThought, ...prev]);
    
    // Extract semantics with Claude (async)
    extractSemantics(newThought.id, text);
  };

  const extractSemantics = async (id: string, text: string) => {
    try {
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      const { tags, relatedThoughtIds } = await response.json();
      
      setThoughts(prev => prev.map(t => 
        t.id === id 
          ? { ...t, tags, connections: relatedThoughtIds }
          : t
      ));
    } catch (error) {
      console.error('Failed to extract semantics:', error);
    }
  };

  const boostThought = (id: string) => {
    setThoughts(prev => prev.map(t => 
      t.id === id 
        ? { ...t, atp: Math.min(100, t.atp + 20) }
        : t
    ));
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Panel 1: Thought Capture */}
      <div className="w-1/3 border-r border-gray-700 p-4 overflow-hidden flex flex-col">
        <h2 className="text-xl font-bold mb-4">Capture Thoughts</h2>
        <ThoughtCapture onAddThought={addThought} thoughts={thoughts} />
      </div>

      {/* Panel 2: Living Graph */}
      <div className="w-1/3 border-r border-gray-700 p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Living Memory</h2>
          <button 
            onClick={() => reanalyzeConnections()}
            className="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700"
          >
            Re-analyze
          </button>
        </div>
        <LivingGraph 
          thoughts={thoughts} 
          onNodeClick={boostThought}
          onSelectionChange={setSelectedThoughts}
        />
      </div>

      {/* Panel 3: Prompt Studio */}
      <div className="w-1/3 p-4">
        <h2 className="text-xl font-bold mb-4">Smart Prompts</h2>
        <PromptStudio 
          thoughts={thoughts}
          selectedThoughts={selectedThoughts}
        />
      </div>
    </div>
  );
}
