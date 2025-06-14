// types/index.ts - TypeScript interfaces
export interface Thought {
  id: string;
  text: string;
  timestamp: number;
  tags: string[];
  atp: number;
  connections: string[];
  status: 'active' | 'dying' | 'fossil';
}