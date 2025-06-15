'use client';

import { useState, useEffect, useCallback } from 'react';
import ThoughtCapture from '@/components/ThoughtCapture';
import LivingGraph from '@/components/LivingGraph';
import PromptStudio from '@/components/PromptStudio';
import { Thought, SemanticTag } from '@/types';

export default function Home() {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [semanticTags, setSemanticTags] = useState<SemanticTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [filteredThoughts, setFilteredThoughts] = useState<Thought[]>([]);

  // Load thoughts and semantic tags from localStorage on mount
  useEffect(() => {
    try {
      const storedThoughts = localStorage.getItem('thoughts');
      const storedTags = localStorage.getItem('semanticTags');
      
      if (storedThoughts) {
        const parsed = JSON.parse(storedThoughts);
        setThoughts(Array.isArray(parsed) ? parsed : []);
      }
      
      if (storedTags) {
        const parsed = JSON.parse(storedTags);
        setSemanticTags(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setThoughts([]);
      setSemanticTags([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save thoughts and semantic tags to localStorage whenever they change
  useEffect(() => {
    if (!isLoading && thoughts.length > 0) {
      localStorage.setItem('thoughts', JSON.stringify(thoughts));
    }
  }, [thoughts, isLoading]);

  useEffect(() => {
    if (!isLoading && semanticTags.length > 0) {
      localStorage.setItem('semanticTags', JSON.stringify(semanticTags));
    }
  }, [semanticTags, isLoading]);

  // Update filtered thoughts when tag selection changes
  useEffect(() => {
    if (selectedTag) {
      const tag = semanticTags.find(t => t.id === selectedTag);
      if (tag) {
        setFilteredThoughts(thoughts.filter(t => tag.thoughtIds.includes(t.id)));
      } else {
        setFilteredThoughts([]);
      }
    } else {
      setFilteredThoughts(thoughts);
    }
  }, [selectedTag, thoughts, semanticTags]);

  // Metabolic decay for thoughts and semantic tags
  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = Date.now();
      
      // Decay thoughts
      setThoughts(prev => prev.map(thought => {
        let newAtp = thought.atp - 0.5;
        newAtp = Math.min(100, Math.max(0, newAtp));
        
        let status: Thought['status'] = 'active';
        if (newAtp < 10) status = 'fossil';
        else if (newAtp < 30) status = 'dying';
        
        return { ...thought, atp: newAtp, status };
      }));
      
      // Decay semantic tags and their connections
      setSemanticTags(prev => prev.map(tag => {
        const timeSinceLastMention = currentTime - tag.lastMentioned;
        const hoursIdle = timeSinceLastMention / (1000 * 60 * 60);
        
        // Base decay - slower for frequently mentioned tags
        let atpDecay = 0.3;
        if (tag.frequency > 5) atpDecay = 0.2; // Frequent tags decay slower
        if (hoursIdle > 1) atpDecay += 0.2; // Extra decay if not mentioned recently
        
        let newAtp = Math.max(0, tag.atp - atpDecay);
        
        // Connection decay - weaken unused connections
        const updatedConnections = tag.connections.map(conn => ({
          ...conn,
          strength: Math.max(0.1, conn.strength - 0.05) // Connections slowly weaken
        })).filter(conn => conn.strength > 0.1); // Remove very weak connections
        
        return {
          ...tag,
          atp: newAtp,
          connections: updatedConnections
        };
      }));
    }, 5000); // Every 5 seconds for demo

    return () => clearInterval(interval);
  }, []);

  // Function to check if two tags are similar (for competition)
  const areTagsSimilar = useCallback((tag1: string, tag2: string): boolean => {
    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const norm1 = normalize(tag1);
    const norm2 = normalize(tag2);
    
    // Check for exact match
    if (norm1 === norm2) return true;
    
    // Check for substring match (one contains the other)
    if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
    
    // Check for similar length and character overlap
    if (Math.abs(norm1.length - norm2.length) <= 2) {
      const shorter = norm1.length <= norm2.length ? norm1 : norm2;
      const longer = norm1.length > norm2.length ? norm1 : norm2;
      let matches = 0;
      for (let char of shorter) {
        if (longer.includes(char)) matches++;
      }
      return matches / shorter.length > 0.7; // 70% character overlap
    }
    
    return false;
  }, []);

  // Function to create or update semantic tags with competition and co-mention strengthening
  const updateSemanticTags = useCallback((thoughtId: string, newTags: string[], relatedTags: string[]) => {
    setSemanticTags(prev => {
      const updated = [...prev];
      const currentTime = Date.now();
      const processedTags: SemanticTag[] = [];
      
      // Process each new tag with competition logic
      newTags.forEach(tagName => {
        // Check for similar existing tags (competition)
        const similarTag = updated.find(t => areTagsSimilar(t.name, tagName));
        
        if (similarTag) {
          // Competition: boost existing similar tag instead of creating new one
          if (!similarTag.thoughtIds.includes(thoughtId)) {
            similarTag.thoughtIds.push(thoughtId);
            similarTag.frequency += 1;
            similarTag.atp = Math.min(100, similarTag.atp + 15); // Extra boost for winning competition
            similarTag.lastMentioned = currentTime;
          }
          processedTags.push(similarTag);
        } else {
          // Check for exact match
          const existing = updated.find(t => t.name.toLowerCase() === tagName.toLowerCase());
          
          if (existing) {
            // Update existing tag
            if (!existing.thoughtIds.includes(thoughtId)) {
              existing.thoughtIds.push(thoughtId);
              existing.frequency += 1;
              existing.atp = Math.min(100, existing.atp + 10);
              existing.lastMentioned = currentTime;
            }
            processedTags.push(existing);
          } else {
            // Create new tag
            const newTag: SemanticTag = {
              id: `tag-${Date.now()}-${Math.random()}`,
              name: tagName,
              thoughtIds: [thoughtId],
              connections: [],
              atp: 80,
              frequency: 1,
              lastMentioned: currentTime
            };
            updated.push(newTag);
            processedTags.push(newTag);
          }
        }
      });
      
      // Co-mention strengthening: strengthen connections between tags that appear together
      for (let i = 0; i < processedTags.length; i++) {
        for (let j = i + 1; j < processedTags.length; j++) {
          const tag1 = processedTags[i];
          const tag2 = processedTags[j];
          
          // Find existing connection from tag1 to tag2
          let connection1 = tag1.connections.find(c => c.tagId === tag2.id);
          if (!connection1) {
            connection1 = { tagId: tag2.id, strength: 0, coMentions: 0 };
            tag1.connections.push(connection1);
          }
          
          // Find existing connection from tag2 to tag1
          let connection2 = tag2.connections.find(c => c.tagId === tag1.id);
          if (!connection2) {
            connection2 = { tagId: tag1.id, strength: 0, coMentions: 0 };
            tag2.connections.push(connection2);
          }
          
          // Strengthen the connection (co-mention)
          connection1.coMentions += 1;
          connection1.strength = Math.min(10, connection1.coMentions * 0.5);
          
          connection2.coMentions += 1;
          connection2.strength = Math.min(10, connection2.coMentions * 0.5);
          
          // Boost ATP for both connected tags
          tag1.atp = Math.min(100, tag1.atp + 2);
          tag2.atp = Math.min(100, tag2.atp + 2);
        }
      }
      
      return updated;
    });
  }, [areTagsSimilar]);

  const addThought = useCallback(async (text: string) => {
    const newThought: Thought = {
      id: Date.now().toString(),
      text,
      timestamp: Date.now(),
      tags: [],
      atp: 100,
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
          existingThoughts: semanticTags.map(t => ({
            id: t.id,
            text: t.name,
            tags: [t.name]
          }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update the thought with extracted tags
        setThoughts(prev => prev.map(t => 
          t.id === newThought.id 
            ? { 
                ...t, 
                tags: Array.isArray(data.tags) ? data.tags : []
              }
            : t
        ));

        // Update semantic tags
        if (data.tags && data.tags.length > 0) {
          updateSemanticTags(
            newThought.id, 
            data.tags, 
            data.relatedTags || []
          );
        }
      }
    } catch (error) {
      console.error('Failed to extract semantics:', error);
      // Continue without tags - the thought is still saved
    }
  }, [thoughts, semanticTags, updateSemanticTags]);

  const boostTag = useCallback((tagId: string) => {
    setSemanticTags(prev => prev.map(tag => 
      tag.id === tagId 
        ? { ...tag, atp: Math.min(100, tag.atp + 10) }
        : tag
    ));
  }, []);

  const selectTag = useCallback((tagId: string) => {
    setSelectedTag(prev => prev === tagId ? null : tagId);
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


  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Panel 1: Thought Capture */}
      <div className="w-1/3 border-r border-gray-700">
        <ThoughtCapture 
          thoughts={filteredThoughts} 
          onAddThought={addThought}
          selectedTag={selectedTag}
        />
      </div>
      
      {/* Panel 2: Living Graph */}
      <div className="w-1/3 border-r border-gray-700">
        <LivingGraph 
          semanticTags={semanticTags} 
          onBoostTag={boostTag}
          onSelectTag={selectTag}
          onReanalyze={reanalyzeConnections}
          selectedTag={selectedTag}
        />
      </div>
      
      {/* Panel 3: Prompt Studio */}
      <div className="w-1/3">
        <PromptStudio 
          thoughts={thoughts}
          semanticTags={semanticTags}
          selectedTag={selectedTag}
        />
      </div>
    </div>
  );
}