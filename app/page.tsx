'use client';

import { useState, useEffect, useCallback } from 'react';
import ThoughtCapture from '@/components/ThoughtCapture';
import LivingGraph from '@/components/LivingGraph';
import PromptStudio from '@/components/PromptStudio';
import { Thought } from '@/types';

export default function Home() {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedThoughts, setSelectedThoughts] = useState<string[]>([]);

  // Load thoughts from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('thoughts');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure parsed is an array
        setThoughts(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.error('Error loading thoughts:', error);
      setThoughts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save thoughts to localStorage whenever they change
  useEffect(() => {
    if (!isLoading && thoughts.length > 0) {
      localStorage.setItem('thoughts', JSON.stringify(thoughts));
    }
  }, [thoughts, isLoading]);

  // Metabolic decay
  useEffect(() => {
    const interval = setInterval(() => {
      setThoughts(prev => prev.map(thought => {
        let newAtp = thought.atp - 0.5;
        
        // Connection bonus - ensure connections is an array
        const connections = Array.isArray(thought.connections) ? thought.connections : [];
        const connectionBonus = connections.length * 0.1;
        newAtp += connectionBonus;
        
        // Cap ATP
        newAtp = Math.min(100, Math.max(0, newAtp));
        
        // Update status
        let status: Thought['status'] = 'active';
        if (newAtp < 10) status = 'fossil';
        else if (newAtp < 30) status = 'dying';
        
        return {
          ...thought,
          atp: newAtp,
          status,
          connections: connections // Ensure connections is always an array
        };
      }));
    }, 5000); // Every 5 seconds for demo

    return () => clearInterval(interval);
  }, []);

  const addThought = useCallback(async (text: string) => {
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

    // Try to extract semantics (with error handling)
    try {
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text,
          existingThoughts: thoughts.map(t => ({
            id: t.id,
            text: t.text,
            tags: t.tags
          }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        setThoughts(prev => prev.map(t => 
          t.id === newThought.id 
            ? { 
                ...t, 
                tags: Array.isArray(data.tags) ? data.tags : [],
                connections: Array.isArray(data.connections) ? data.connections : []
              }
            : t
        ));

        // Update connection bonus for connected thoughts
        if (data.connections && data.connections.length > 0) {
          setThoughts(prev => prev.map(t => 
            data.connections.includes(t.id)
              ? { ...t, atp: Math.min(100, t.atp + 5) } // Boost connected thoughts
              : t
          ));
        }
      }
    } catch (error) {
      console.error('Failed to extract semantics:', error);
      // Continue without tags - the thought is still saved
    }
  }, [thoughts]);

  const boostThought = useCallback((id: string) => {
    setThoughts(prev => prev.map(thought => 
      thought.id === id 
        ? { ...thought, atp: Math.min(100, thought.atp + 10) }
        : thought
    ));
  }, []);

  const reanalyzeConnections = useCallback(async () => {
  if (thoughts.length < 2) return;

  try {
    // Analyze each thought for connections with all others
    for (const thought of thoughts) {
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: thought.text,
          existingThoughts: thoughts
            .filter(t => t.id !== thought.id)
            .map(t => ({
              id: t.id,
              text: t.text,
              tags: t.tags
            }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        setThoughts(prev => prev.map(t => 
          t.id === thought.id 
            ? { 
                ...t, 
                tags: Array.isArray(data.tags) ? data.tags : t.tags,
                connections: Array.isArray(data.connections) ? data.connections : []
              }
            : t
        ));
      }
    }
  } catch (error) {
    console.error('Failed to reanalyze connections:', error);
  }
}, [thoughts]);

  const handleSelectThought = useCallback((id: string) => {
    setSelectedThoughts(prev => 
      prev.includes(id) 
        ? prev.filter(t => t !== id)
        : [...prev, id]
    );
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Panel 1: Thought Capture */}
      <div className="w-1/3 border-r border-gray-200">
        <ThoughtCapture thoughts={thoughts} onAddThought={addThought} />
      </div>
      
      {/* Panel 2: Living Graph */}
      <div className="w-1/3 border-r border-gray-200">
        <LivingGraph 
          thoughts={thoughts} 
          onBoostThought={boostThought}
          onReanalyze={reanalyzeConnections}
          onSelectThought={handleSelectThought}
        />
      </div>
      
      {/* Panel 3: Prompt Studio */}
      <div className="w-1/3">
        <PromptStudio 
          thoughts={thoughts}
          selectedThoughts={selectedThoughts}
        />
      </div>
    </div>
  );
}