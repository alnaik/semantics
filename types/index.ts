// types/index.ts - TypeScript interfaces
export interface Thought {
  id: string;
  text: string;
  timestamp: number;
  tags: string[];
  atp: number;
  status: 'active' | 'dying' | 'fossil';
}

export interface TagConnection {
  tagId: string;
  strength: number;
  coMentions: number;
}

export interface SemanticTag {
  id: string;
  name: string;
  thoughtIds: string[];
  connections: TagConnection[];
  atp: number;
  frequency: number;
  lastMentioned: number;
}

export interface GraphNode extends SemanticTag {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}