// lib/metabolic.ts
import { Thought } from '@/types';

export function updateMetabolism(thoughts: Thought[]): Thought[] {
    return thoughts.map(thought => {
      let newAtp = thought.atp;
      
      // Base decay
      newAtp -= 0.5;
      
      // No connection bonus for thoughts - handled by semantic tags
      
      // Ensure ATP stays within bounds
      newAtp = Math.max(0, Math.min(100, newAtp));
      
      // Update status based on ATP
      let status: Thought['status'] = 'active';
      if (newAtp < 10) status = 'fossil';
      else if (newAtp < 30) status = 'dying';
      
      return {
        ...thought,
        atp: newAtp,
        status
      };
    });
  }