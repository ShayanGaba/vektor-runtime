import { Injectable, signal, computed } from '@angular/core';

export interface VirtualFile {
  name: string;
  content: string;
  type: string;
  updatedAt: number;
}

export interface TerminalLine {
  id: string;
  command: string;
  output: string;
  timestamp: number;
}

export interface ActivityItem {
  id: string;
  tool: string;
  description: string;
  status: 'running' | 'done' | 'error';
  timestamp: number;
}

interface WorkspaceData {
  files: VirtualFile[];
  terminal: TerminalLine[];
  activityLog: ActivityItem[];
}

@Injectable({ providedIn: 'root' })
export class AgentWorkspaceService {
  private readonly WS_KEY = 'vektor_workspaces_v2';
  
  private workspaces = signal<Map<string, WorkspaceData>>(new Map());
  activeSessionId = signal<string | null>(null);
  
  files = computed(() => {
    const id = this.activeSessionId();
    if (!id) return [];
    return this.workspaces().get(id)?.files || [];
  });
  
  terminal = computed(() => {
    const id = this.activeSessionId();
    if (!id) return [];
    return this.workspaces().get(id)?.terminal || [];
  });
  
  activityLog = computed(() => {
    const id = this.activeSessionId();
    if (!id) return [];
    const log = this.workspaces().get(id)?.activityLog || [];
    return log.sort((a, b) => b.timestamp - a.timestamp);
  });
  
  activeTools = computed(() => {
    const id = this.activeSessionId();
    if (!id) return [];
    return (this.workspaces().get(id)?.activityLog || [])
      .filter(a => a.status === 'running')
      .map(a => a.tool);
  });

  constructor() {
    this.loadWorkspaces();
  }

  setActiveSession(id: string) {
    const map = new Map(this.workspaces());
    if (!map.has(id)) {
      map.set(id, { files: [], terminal: [], activityLog: [] });
      this.workspaces.set(map);
      this.saveWorkspaces();
    }
    this.activeSessionId.set(id);
  }

  removeSession(id: string) {
    const map = new Map(this.workspaces());
    map.delete(id);
    this.workspaces.set(map);
    this.saveWorkspaces();
  }

  clearSession(id: string) {
    const map = new Map(this.workspaces());
    map.set(id, { files: [], terminal: [], activityLog: [] });
    this.workspaces.set(map);
    this.saveWorkspaces();
  }

  runTool(sessionId: string, toolName: string, params: any): { ok: boolean; result: string } {
    this.addActivity(sessionId, toolName, 'running');
    
    let outcome = { ok: false, result: '' };
    try {
      switch (toolName) {
        case 'file_create':
          outcome = this.createFile(sessionId, params);
          break;
        case 'file_edit':
          outcome = this.editFile(sessionId, params);
          break;
        case 'run_command':
          outcome = this.runCommand(sessionId, params);
          break;
        case 'web_search':
          outcome = this.webSearch(sessionId, params);
          break;
        default:
          outcome = { ok: false, result: 'Tool not found' };
      }
    } catch (err: any) {
      outcome = { ok: false, result: err.message || 'Error' };
    }

    this.updateActivityStatus(sessionId, toolName, outcome.ok ? 'done' : 'error', outcome.result);
    return outcome;
  }

  private createFile(sessionId: string, params: any) {
    const name = params.name || 'untitled.txt';
    const file: VirtualFile = {
      name,
      content: params.content || '',
      type: this.getFileType(name),
      updatedAt: Date.now()
    };
    this.updateSession(sessionId, data => ({
      ...data,
      files: [...data.files.filter(f => f.name !== name), file]
    }));
    return { ok: true, result: `Created ${name}` };
  }

  private editFile(sessionId: string, params: any) {
    const name = params.name;
    this.updateSession(sessionId, data => ({
      ...data,
      files: data.files.map(f => f.name === name ? { ...f, content: params.content || f.content, updatedAt: Date.now() } : f)
    }));
    return { ok: true, result: `Updated ${name}` };
  }

  private runCommand(sessionId: string, params: any) {
    const line: TerminalLine = {
      id: this.makeId(),
      command: params.command || '',
      output: params.output || 'Done.',
      timestamp: Date.now()
    };
    this.updateSession(sessionId, data => ({
      ...data,
      terminal: [...data.terminal, line]
    }));
    return { ok: true, result: `Ran: ${line.command}` };
  }

  private webSearch(sessionId: string, params: any) {
    return { ok: true, result: `Searched for: "${params.query || 'unknown'}"` };
  }

  private addActivity(sessionId: string, tool: string, status: 'running' | 'done' | 'error') {
    const item: ActivityItem = {
      id: this.makeId(),
      tool,
      description: this.getToolDescription(tool),
      status,
      timestamp: Date.now()
    };
    this.updateSession(sessionId, data => ({
      ...data,
      activityLog: [...data.activityLog, item]
    }));
  }

  private updateActivityStatus(sessionId: string, tool: string, status: 'done' | 'error', result: string) {
    this.updateSession(sessionId, data => ({
      ...data,
      activityLog: data.activityLog.map(a => 
        a.tool === tool && a.status === 'running' ? { ...a, status, description: result } : a
      )
    }));
  }

  private updateSession(sessionId: string, updateFn: (data: WorkspaceData) => WorkspaceData) {
    const map = new Map(this.workspaces());
    const current = map.get(sessionId) || { files: [], terminal: [], activityLog: [] };
    map.set(sessionId, updateFn(current));
    this.workspaces.set(map);
    this.saveWorkspaces();
  }

  private getToolDescription(tool: string): string {
    const map: Record<string, string> = {
      file_create: 'Creating file...',
      file_edit: 'Editing file...',
      run_command: 'Running command...',
      web_search: 'Searching web...'
    };
    return map[tool] || 'Working...';
  }

  private getFileType(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const map: Record<string, string> = {
      js: 'javascript', ts: 'typescript', html: 'html', css: 'css',
      json: 'json', py: 'python', md: 'markdown', svg: 'svg',
      jsx: 'jsx', tsx: 'tsx', vue: 'vue', go: 'go', rs: 'rust',
      java: 'java', cpp: 'cpp', c: 'c', cs: 'csharp', rb: 'ruby',
      php: 'php', sql: 'sql', sh: 'shell', yaml: 'yaml', yml: 'yaml'
    };
    return map[ext] || 'file';
  }

  private saveWorkspaces() {
    try {
      localStorage.setItem(this.WS_KEY, JSON.stringify(Array.from(this.workspaces().entries())));
    } catch (e) {}
  }

  private loadWorkspaces() {
    try {
      const raw = localStorage.getItem(this.WS_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        this.workspaces.set(new Map(arr));
      }
    } catch (e) {}
  }

  private makeId(): string {
    return 'tool-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5);
  }
}