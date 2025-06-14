// types/index.ts - TypeScript interfaces
export interface Thought {
    id: string;
    text: string;
    timestamp: number;
    tags: string[];
    atp: number; // 0-100
    connections: string[]; // IDs of related thoughts
    status: 'active' | 'dying' | 'fossil';
  }