// Enumeration for different pages/views in the application
export enum Page {
  Chat = 'Chat',
  Reminders = 'Reminders',
  Entertainment = 'Entertainment',
  FamilyConnect = 'Family Connect',
}

// Type for a single chat message
export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  audioUrl?: string; // Optional URL for playing back AI audio responses
}

// Type for a reminder
export interface Reminder {
  id: string;
  time: string; // e.g., "08:00 AM"
  message: string;
  isMedication: boolean;
  active: boolean;
}
