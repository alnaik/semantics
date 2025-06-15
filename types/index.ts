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

export interface GraphNode extends Thought {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}