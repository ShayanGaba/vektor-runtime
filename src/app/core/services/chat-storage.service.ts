import { Injectable, signal } from '@angular/core';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isAgentMode?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  mode: 'chat' | 'agent';
  createdAt: number;
  updatedAt: number;
}

@Injectable({ providedIn: 'root' })
export class ChatStorageService {
  private readonly CHAT_KEY = 'vektor_chats_v2';
  private readonly CURRENT_KEY = 'vektor_current_chat';

  sessions = signal<ChatSession[]>([]);
  activeId = signal<string | null>(null);

  constructor() {
    this.loadData();
  }

  private loadData() {
    try {
      const saved = localStorage.getItem(this.CHAT_KEY);
      const current = localStorage.getItem(this.CURRENT_KEY);
      if (saved) this.sessions.set(JSON.parse(saved));
      if (current) this.activeId.set(current);
    } catch (e) {
      console.error('Load error:', e);
    }
  }

  saveData() {
    try {
      localStorage.setItem(this.CHAT_KEY, JSON.stringify(this.sessions()));
      localStorage.setItem(this.CURRENT_KEY, this.activeId() || '');
    } catch (e) {
      console.error('Save error:', e);
    }
  }

  createSession(mode: 'chat' | 'agent' = 'chat'): ChatSession {
    const session: ChatSession = {
      id: this.makeId(),
      title: mode === 'agent' ? 'New Agent Task' : 'New Chat',
      messages: [],
      mode,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.sessions.update(list => [session, ...list]);
    this.activeId.set(session.id);
    this.saveData();
    return session;
  }

  deleteSession(id: string) {
    this.sessions.update(list => list.filter(s => s.id !== id));
    if (this.activeId() === id) {
      const remaining = this.sessions();
      this.activeId.set(remaining.length > 0 ? remaining[0].id : null);
    }
    if (this.sessions().length === 0) {
      this.createSession(this.currentMode());
    }
    this.saveData();
  }

  selectSession(id: string) {
    this.activeId.set(id);
    this.saveData();
  }

  updateSession(id: string, patch: Partial<ChatSession>) {
    this.sessions.update(list =>
      list.map(s => s.id === id ? { ...s, ...patch, updatedAt: Date.now() } : s)
    );
    this.saveData();
  }

  getActiveSession(): ChatSession | undefined {
    return this.sessions().find(s => s.id === this.activeId());
  }

  currentMode(): 'chat' | 'agent' {
    const active = this.getActiveSession();
    return active ? active.mode : 'chat';
  }

  private makeId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  }
}