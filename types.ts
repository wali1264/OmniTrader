
export interface PlantCareInfo {
  plantName: string;
  scientificName: string;
  description: string;
  watering: string;
  sunlight: string;
  soil: string;
  difficulty: 'Easy' | 'Moderate' | 'Challenging';
  pests: string[];
  tips: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export enum AppView {
  IDENTIFY = 'IDENTIFY',
  CHAT = 'CHAT',
  HISTORY = 'HISTORY'
}
