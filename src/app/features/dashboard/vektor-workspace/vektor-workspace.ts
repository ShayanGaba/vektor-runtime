import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  NgZone,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { GroqService } from '../../../core/services/groq';
import { ChatStorageService, ChatMessage } from '../../../core/services/chat-storage.service';
import { AgentWorkspaceService, VirtualFile } from '../../../core/services/agent-workspace.service';
import { MarkdownPipe } from '../../../shared/pipes/markdown.pipe';

@Component({
  selector: 'app-vektor-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownPipe, DatePipe],
  template: `
    <div
      *ngIf="isAppLoading()"
      class="fixed inset-0 z-[9999] bg-[#0a0a0a] flex flex-col items-center justify-center transition-opacity duration-700"
      [class.opacity-0]="fadeOut"
      [class.pointer-events-none]="fadeOut"
    >
      <div
        class="absolute inset-0 opacity-[0.15]"
        style="background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0); background-size: 40px 40px;"
      ></div>
      <div class="relative w-24 h-24 mb-10">
        <div class="absolute inset-0 border border-white/10 rounded-full"></div>
        <div
          class="absolute inset-0 border-2 border-t-white/80 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"
        ></div>
        <div class="absolute inset-3 border border-white/20 rounded-full"></div>
        <div
          class="absolute inset-3 border-2 border-t-transparent border-r-white/60 border-b-transparent border-l-transparent rounded-full animate-spin"
          style="animation-direction: reverse; animation-duration: 1.5s;"
        ></div>
        <div class="absolute inset-6 border border-white/30 rounded-full"></div>
        <div class="absolute inset-0 flex items-center justify-center">
          <div
            class="w-2.5 h-2.5 bg-white rounded-full animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.4)]"
          ></div>
        </div>
      </div>
      <h1 class="text-3xl font-bold tracking-[0.35em] text-white mb-3">VEKTOR</h1>
      <p class="text-gray-500 text-xs tracking-[0.2em] uppercase mb-10">Initializing Workspace</p>
      <div class="w-44 h-[2px] bg-white/10 rounded-full overflow-hidden">
        <div
          class="h-full bg-white rounded-full"
          style="animation: loadbar 2.2s ease-in-out forwards;"
        ></div>
      </div>
    </div>

    <div
      class="flex h-screen w-screen bg-[#0f0f0f] text-gray-100 overflow-hidden selection:bg-white/20"
    >
      <aside
        class="w-[280px] bg-[#171717] border-r border-white/5 flex flex-col shrink-0 transition-transform duration-300"
        [class.-translate-x-full]="!sidebarOpen() && isMobile"
        [class.absolute]="isMobile"
        [class.z-20]="isMobile"
        [class.h-full]="isMobile"
      >
        <div class="p-4 flex items-center gap-3 border-b border-white/5">
          <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
            <span class="text-black font-bold text-sm">V</span>
          </div>
          <div>
            <div class="font-semibold text-lg tracking-tight leading-none">Vektor</div>
            <div class="text-[10px] text-gray-500 tracking-wider uppercase mt-0.5">Workspace</div>
          </div>
          <button
            *ngIf="isMobile"
            (click)="sidebarOpen.set(false)"
            class="ml-auto text-gray-400 hover:text-white"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div class="p-3">
          <button
            (click)="startNewChat()"
            class="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white text-black rounded-lg hover:bg-gray-200 active:scale-[0.98] transition-all font-medium text-sm"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            New chat
          </button>
        </div>

        <div class="px-3 mb-4">
          <div class="flex bg-[#252525] rounded-lg p-1">
            <button
              (click)="switchMode('chat')"
              [class.bg-[#3a3a3a]]="currentMode() === 'chat'"
              [class.text-white]="currentMode() === 'chat'"
              class="flex-1 py-1.5 text-xs font-medium rounded-md text-gray-400 transition-all"
            >
              Chat
            </button>
            <button
              (click)="switchMode('agent')"
              [class.bg-[#3a3a3a]]="currentMode() === 'agent'"
              [class.text-white]="currentMode() === 'agent'"
              class="flex-1 py-1.5 text-xs font-medium rounded-md text-gray-400 transition-all"
            >
              Agent
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-3 pb-3">
          <div class="text-xs font-semibold text-gray-500 mb-2 px-1">Recent chats</div>
          <div *ngIf="sessions().length === 0" class="text-center text-gray-600 text-xs mt-4">
            No chats yet
          </div>

          <div
            *ngFor="let session of sessions()"
            (click)="selectChat(session.id)"
            [class.bg-[#2a2a2a]]="activeId() === session.id"
            class="group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-[#252525] transition-all mb-1 border border-transparent"
            [class.border-white/5]="activeId() === session.id"
          >
            <svg
              class="w-4 h-4 shrink-0 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                *ngIf="session.mode === 'chat'"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
              <path
                *ngIf="session.mode === 'agent'"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
            <span class="truncate flex-1 text-sm text-gray-300">{{ session.title }}</span>
            <button
              (click)="deleteChat(session.id, $event)"
              class="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-all"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-16v1a3 3 0 003 3h10M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>

        <div class="p-3 border-t border-white/5">
          <div class="text-[11px] text-gray-600 text-center">Chats saved in this browser</div>
        </div>
      </aside>

      <div
        *ngIf="isMobile && sidebarOpen()"
        (click)="sidebarOpen.set(false)"
        class="fixed inset-0 bg-black/50 z-10"
      ></div>

      <main class="flex-1 flex flex-col min-w-0 bg-[#121212]">
        <header
          class="h-14 border-b border-white/5 flex items-center justify-between px-4 shrink-0"
        >
          <div class="flex items-center gap-3">
            <button
              *ngIf="isMobile"
              (click)="sidebarOpen.set(true)"
              class="text-gray-400 hover:text-white"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <div class="flex items-center gap-2">
              <span class="font-medium text-sm">{{
                currentMode() === 'chat' ? 'Vektor Chat' : 'Vektor Agent'
              }}</span>
              <span
                *ngIf="currentMode() === 'agent'"
                class="px-2 py-0.5 bg-orange-500/15 text-orange-400 text-[10px] font-bold rounded-full border border-orange-500/20 uppercase tracking-wider"
                >Agent</span
              >
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              *ngIf="activeMessages().length > 0"
              (click)="exportChat()"
              class="text-xs text-gray-500 hover:text-white px-2 py-1 rounded hover:bg-white/5 transition-colors"
              title="Export chat"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </button>
            <button
              *ngIf="currentMode() === 'agent'"
              (click)="clearWorkspace()"
              class="text-xs text-gray-500 hover:text-white px-2 py-1 rounded hover:bg-white/5 transition-colors"
            >
              Clear workspace
            </button>
          </div>
        </header>

        <div class="flex-1 overflow-y-auto scroll-smooth" id="chat-box" #chatBox>
          <div class="max-w-3xl mx-auto px-4 py-8">
            <div
              *ngIf="activeMessages().length === 0 && !isGenerating"
              class="flex flex-col items-center justify-center h-[55vh] text-center"
            >
              <div
                class="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 flex items-center justify-center mb-6 shadow-xl"
              >
                <svg
                  class="w-7 h-7 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    *ngIf="currentMode() === 'chat'"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                  <path
                    *ngIf="currentMode() === 'agent'"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h2 class="text-2xl font-semibold mb-2 text-white">
                {{
                  currentMode() === 'chat' ? 'How can I help you today?' : 'What task shall I do?'
                }}
              </h2>
              <p class="text-gray-400 text-sm mb-8 max-w-md">
                {{
                  currentMode() === 'chat'
                    ? 'Ask me anything. I can explain topics, write code, or help you think through problems.'
                    : 'I can write code, create files, run commands, and build things in your workspace.'
                }}
              </p>
              <div class="flex flex-wrap gap-2 justify-center max-w-lg">
                <button
                  *ngFor="let prompt of quickPrompts()"
                  (click)="usePrompt(prompt)"
                  class="px-4 py-2.5 bg-[#1e1e1e] hover:bg-[#252525] border border-white/10 hover:border-white/20 rounded-xl text-sm text-gray-300 transition-all text-left"
                >
                  {{ prompt }}
                </button>
              </div>
            </div>

            <div *ngFor="let msg of activeMessages(); let last = last" class="mb-6 group/message">
              <div *ngIf="msg.role === 'user'" class="flex justify-end">
                <div
                  class="bg-[#2f2f2f] text-white rounded-2xl rounded-tr-sm px-5 py-3 max-w-[85%] text-sm leading-relaxed shadow-sm"
                >
                  {{ msg.content }}
                  <div
                    class="text-[10px] text-gray-500 mt-1 text-right opacity-0 group-hover/message:opacity-100 transition-opacity"
                  >
                    {{ msg.timestamp | date: 'shortTime' }}
                  </div>
                </div>
              </div>

              <div *ngIf="msg.role === 'assistant'" class="flex justify-start gap-3">
                <div
                  class="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border border-white/10 flex items-center justify-center shrink-0 mt-1"
                >
                  <svg
                    class="w-4 h-4 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      *ngIf="!msg.isAgentMode"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                    <path
                      *ngIf="msg.isAgentMode"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                    />
                  </svg>
                </div>
                <div class="flex-1 max-w-[85%] min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-[11px] text-gray-500 font-medium tracking-wide uppercase">
                      {{ msg.isAgentMode ? 'Vektor Agent' : 'Vektor' }}
                    </span>
                    <span
                      class="text-[10px] text-gray-600 opacity-0 group-hover/message:opacity-100 transition-opacity"
                    >
                      {{ msg.timestamp | date: 'shortTime' }}
                    </span>
                  </div>
                  <div
                    class="text-gray-100 text-sm leading-relaxed markdown-content"
                    [innerHTML]="msg.content | markdown"
                  ></div>
                </div>
              </div>
            </div>

            <div *ngIf="isGenerating" class="flex justify-start gap-3 mb-6">
              <div
                class="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border border-white/10 flex items-center justify-center shrink-0 mt-1"
              >
                <svg
                  class="w-4 h-4 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    *ngIf="currentMode() !== 'agent'"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                  <path
                    *ngIf="currentMode() === 'agent'"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                  />
                </svg>
              </div>
              <div class="flex-1 max-w-[85%] min-w-0">
                <div class="text-[11px] text-gray-500 mb-1 font-medium tracking-wide uppercase">
                  {{ currentMode() === 'agent' ? 'Vektor Agent' : 'Vektor' }}
                </div>
                <div
                  *ngIf="streamContent() as text"
                  class="text-gray-100 text-sm leading-relaxed whitespace-pre-wrap font-mono"
                >
                  {{ text
                  }}<span
                    class="inline-block w-[2px] h-4 bg-white/80 ml-0.5 animate-pulse align-middle"
                  ></span>
                </div>
                <div *ngIf="!streamContent()" class="flex items-center gap-1.5 py-2">
                  <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div
                    class="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                    style="animation-delay: 0.15s"
                  ></div>
                  <div
                    class="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                    style="animation-delay: 0.3s"
                  ></div>
                </div>
              </div>
            </div>

            <div #bottomAnchor></div>
          </div>
        </div>

        <div class="shrink-0 bg-[#121212] border-t border-white/5 px-4 pb-6 pt-3">
          <div class="max-w-3xl mx-auto">
            <div
              class="relative bg-[#1e1e1e] border border-white/10 rounded-2xl focus-within:border-white/25 focus-within:shadow-[0_0_0_1px_rgba(255,255,255,0.05)] transition-all"
            >
              <textarea
                [(ngModel)]="userInput"
                (keydown.enter)="handleEnter($event)"
                [placeholder]="
                  currentMode() === 'chat' ? 'Message Vektor...' : 'Tell Vektor what to build...'
                "
                class="w-full bg-transparent text-white px-4 py-3.5 pr-12 outline-none resize-none text-sm max-h-32 scrollbar-thin"
                rows="1"
                style="min-height: 52px; field-sizing: content;"
              ></textarea>
              <button
                *ngIf="!isGenerating"
                (click)="sendMessage()"
                [disabled]="!userInput.trim()"
                class="absolute right-2.5 bottom-2.5 w-8 h-8 bg-white text-black rounded-lg flex items-center justify-center hover:bg-gray-200 disabled:opacity-30 transition-all active:scale-95"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
              <button
                *ngIf="isGenerating"
                (click)="stopGeneration()"
                class="absolute right-2.5 bottom-2.5 w-8 h-8 bg-red-500 text-white rounded-lg flex items-center justify-center hover:bg-red-600 transition-all active:scale-95"
                title="Stop generating"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
            </div>
            <div class="text-center mt-2 text-[11px] text-gray-600">
              AI can make mistakes. Double-check important work.
            </div>
          </div>
        </div>
      </main>

      <aside
        *ngIf="currentMode() === 'agent'"
        class="w-[320px] bg-[#171717] border-l border-white/5 flex flex-col shrink-0 hidden lg:flex"
      >
        <div class="flex border-b border-white/5">
          <button
            (click)="workspaceTab.set('files')"
            [class.border-b-2]="workspaceTab() === 'files'"
            [class.border-white]="workspaceTab() === 'files'"
            [class.text-white]="workspaceTab() === 'files'"
            class="flex-1 py-3 text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors border-transparent"
          >
            Files
          </button>
          <button
            (click)="workspaceTab.set('terminal')"
            [class.border-b-2]="workspaceTab() === 'terminal'"
            [class.border-white]="workspaceTab() === 'terminal'"
            [class.text-white]="workspaceTab() === 'terminal'"
            class="flex-1 py-3 text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors border-transparent"
          >
            Terminal
          </button>
          <button
            (click)="workspaceTab.set('activity')"
            [class.border-b-2]="workspaceTab() === 'activity'"
            [class.border-white]="workspaceTab() === 'activity'"
            [class.text-white]="workspaceTab() === 'activity'"
            class="flex-1 py-3 text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors border-transparent"
          >
            Activity
          </button>
        </div>

        <div *ngIf="workspaceTab() === 'files'" class="flex-1 overflow-y-auto p-3">
          <div
            *ngIf="workspaceFiles().length === 0"
            class="flex flex-col items-center justify-center h-40 text-gray-600 text-sm"
          >
            <svg
              class="w-8 h-8 mb-2 opacity-30"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
            </svg>
            No files yet
          </div>
          <div
            *ngFor="let file of workspaceFiles()"
            (click)="openFile(file)"
            class="group flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-[#252525] cursor-pointer transition-colors mb-1 border border-transparent hover:border-white/5"
          >
            <svg
              class="w-4 h-4 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span class="text-sm text-gray-300 flex-1 truncate">{{ file.name }}</span>
            <span class="text-[10px] text-gray-600 uppercase">{{ file.type }}</span>
          </div>
        </div>

        <div
          *ngIf="workspaceTab() === 'terminal'"
          class="flex-1 overflow-y-auto p-3 font-mono text-xs"
        >
          <div
            *ngIf="terminalLogs().length === 0"
            class="flex flex-col items-center justify-center h-40 text-gray-600"
          >
            <svg
              class="w-8 h-8 mb-2 opacity-30"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M8 9l3 3-3 3m5 0h7M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            No commands yet
          </div>
          <div
            *ngFor="let log of terminalLogs()"
            class="mb-3 pb-3 border-b border-white/5 last:border-0"
          >
            <div class="flex items-center gap-2 mb-1">
              <span class="text-green-400">$</span>
              <span class="text-gray-300">{{ log.command }}</span>
            </div>
            <div class="text-gray-500 whitespace-pre-wrap pl-4">{{ log.output }}</div>
          </div>
        </div>

        <div *ngIf="workspaceTab() === 'activity'" class="flex-1 overflow-y-auto p-3">
          <div
            *ngIf="activityLog().length === 0"
            class="flex flex-col items-center justify-center h-40 text-gray-600 text-sm"
          >
            <svg
              class="w-8 h-8 mb-2 opacity-30"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            No activity yet
          </div>
          <div
            *ngFor="let item of activityLog()"
            class="flex items-start gap-2 px-3 py-2.5 rounded-lg mb-1.5 border border-white/5"
            [class.bg-[#252525]]="item.status === 'running'"
          >
            <div
              class="w-2 h-2 rounded-full mt-1.5 shrink-0"
              [class.bg-orange-400]="item.status === 'running'"
              [class.bg-green-400]="item.status === 'done'"
              [class.bg-red-400]="item.status === 'error'"
            ></div>
            <div class="flex-1 min-w-0">
              <div class="text-sm text-gray-300 capitalize">{{ item.tool.replace('_', ' ') }}</div>
              <div class="text-xs text-gray-500 truncate">{{ item.description }}</div>
              <div class="text-[10px] text-gray-600 mt-0.5">
                {{ item.timestamp | date: 'shortTime' }}
              </div>
            </div>
          </div>
        </div>

        <div *ngIf="viewingFile()" class="absolute inset-0 bg-[#171717] z-10 flex flex-col">
          <div
            class="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-[#1e1e1e]"
          >
            <span class="text-sm font-medium text-gray-300">{{ viewingFile()?.name }}</span>
            <div class="flex items-center gap-2">
              <button
                (click)="copyFileContent()"
                class="text-xs text-gray-500 hover:text-white px-2 py-1 rounded hover:bg-white/5 transition-colors"
              >
                Copy
              </button>
              <button (click)="viewingFile.set(null)" class="text-gray-500 hover:text-white">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
          <pre class="flex-1 overflow-auto p-3 text-xs font-mono text-gray-300 bg-[#0f0f0f]">{{
            viewingFile()?.content
          }}</pre>
        </div>
      </aside>
    </div>
  `,
  styles: [
    `
      @keyframes loadbar {
        0% {
          width: 0%;
        }
        50% {
          width: 65%;
        }
        100% {
          width: 100%;
        }
      }
      .markdown-content p {
        margin-bottom: 0.75rem;
      }
      .markdown-content ul {
        margin-bottom: 0.75rem;
      }
      .markdown-content h2,
      .markdown-content h3 {
        margin-top: 1.25rem;
        margin-bottom: 0.5rem;
      }
      .markdown-content br {
        display: block;
        content: '';
        margin-bottom: 0.25rem;
      }
      .markdown-content code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      }
    `,
  ],
})
export class VektorWorkspaceComponent implements OnInit {
  private groq = inject(GroqService);
  private storage = inject(ChatStorageService);
  private workspace = inject(AgentWorkspaceService);
  private zone = inject(NgZone);

  @ViewChild('chatBox') chatBox!: ElementRef;
  @ViewChild('bottomAnchor') bottomAnchor!: ElementRef;

  isAppLoading = signal(true);
  fadeOut = false;

  sidebarOpen = signal(true);
  isMobile = false;
  workspaceTab = signal<'files' | 'terminal' | 'activity'>('files');

  sessions = computed(() => this.storage.sessions());
  activeId = computed(() => this.storage.activeId());
  currentMode = computed(() => this.storage.currentMode());

  activeMessages = computed(() => {
    const session = this.storage.getActiveSession();
    return session ? session.messages : [];
  });

  workspaceFiles = computed(() => this.workspace.files());
  terminalLogs = computed(() => this.workspace.terminal());
  activityLog = computed(() => this.workspace.activityLog());
  activeTools = computed(() => this.workspace.activeTools());
  viewingFile = signal<VirtualFile | null>(null);

  streamContent = signal('');
  isGenerating = false;
  private streamSub: Subscription | null = null;

  quickPrompts = computed(() => {
    if (this.currentMode() === 'chat') {
      return [
        'Explain quantum computing simply',
        'Write a Python script to sort a CSV',
        'Help me debug an error',
        'Give me project ideas',
      ];
    }
    return [
      'Create a full React todo app with hooks, localStorage, and dark CSS',
      'Build an Express API with MongoDB, JWT auth, and validation',
      'Make a responsive landing page with Tailwind and animations',
      'Create a Python CLI tool with argparse and error handling',
    ];
  });

  userInput = '';

  ngOnInit() {
    this.checkMobile();
    window.addEventListener('resize', () => this.checkMobile());

    // keyboard shortcuts
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k' && !e.shiftKey) {
        e.preventDefault();
        this.startNewChat();
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'K') {
        e.preventDefault();
        if (this.currentMode() === 'agent') this.clearWorkspace();
      }
      if (e.key === 'Escape' && this.sidebarOpen() && this.isMobile) {
        this.sidebarOpen.set(false);
      }
    });

    setTimeout(() => {
      this.fadeOut = true;
      setTimeout(() => this.isAppLoading.set(false), 700);
    }, 2400);

    const active = this.storage.getActiveSession();
    if (active) {
      this.workspace.setActiveSession(active.id);
    } else {
      const session = this.storage.createSession('chat');
      this.workspace.setActiveSession(session.id);
    }
  }

  private checkMobile() {
    this.isMobile = window.innerWidth < 768;
    if (this.isMobile) this.sidebarOpen.set(false);
  }

  startNewChat() {
    const mode = this.currentMode();
    const session = this.storage.createSession(mode);
    this.workspace.setActiveSession(session.id);
    if (this.isMobile) this.sidebarOpen.set(false);
  }

  switchMode(mode: 'chat' | 'agent') {
    const id = this.activeId();
    if (id) {
      this.storage.updateSession(id, { mode });
    }
  }

  selectChat(id: string) {
    this.storage.selectSession(id);
    this.workspace.setActiveSession(id);
    if (this.isMobile) this.sidebarOpen.set(false);
  }

  deleteChat(id: string, event: Event) {
    event.stopPropagation();
    this.workspace.removeSession(id);
    this.storage.deleteSession(id);
  }

  usePrompt(text: string) {
    this.userInput = text;
    this.sendMessage();
  }

  handleEnter(event: Event) {
    const e = event as KeyboardEvent;
    if (!e.shiftKey) {
      e.preventDefault();
      this.sendMessage();
    }
  }

  sendMessage() {
    const text = this.userInput.trim();
    if (!text || this.isGenerating) return;

    let session = this.storage.getActiveSession();
    if (!session) {
      session = this.storage.createSession(this.currentMode());
      this.workspace.setActiveSession(session.id);
    }

    const userMsg: ChatMessage = {
      id: this.makeId(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
      isAgentMode: session.mode === 'agent',
    };
    session.messages.push(userMsg);

    if (session.messages.length === 1) {
      session.title = text.slice(0, 32) + (text.length > 32 ? '...' : '');
    }
    session.updatedAt = Date.now();

    this.userInput = '';
    this.isGenerating = true;
    this.streamContent.set('');
    this.storage.saveData();
    this.scrollDown();

    const stream$ =
      session.mode === 'agent'
        ? this.groq.streamAgent(session.messages.map((m) => ({ role: m.role, content: m.content })))
        : this.groq.streamChat(session.messages.map((m) => ({ role: m.role, content: m.content })));

    let fullText = '';

    this.streamSub = stream$.subscribe({
      next: (chunk: string) => {
        this.zone.run(() => {
          fullText += chunk;
          this.streamContent.set(fullText);
          this.scrollDown();
        });
      },
      error: (err) => {
        this.zone.run(() => {
          console.error('Stream error:', err);
          this.isGenerating = false;
          this.streamContent.set('');
          session!.messages.push({
            id: this.makeId(),
            role: 'assistant',
            content: 'Sorry, something went wrong. Please check your connection and try again.',
            timestamp: Date.now(),
            isAgentMode: session!.mode === 'agent',
          });
          this.storage.saveData();
          this.scrollDown();
        });
      },
      complete: () => {
        this.zone.run(() => {
          let finalText = fullText;
          if (session!.mode === 'agent') {
            finalText = this.runAgentTools(fullText, session!.id);
          }

          session!.messages.push({
            id: this.makeId(),
            role: 'assistant',
            content: finalText,
            timestamp: Date.now(),
            isAgentMode: session!.mode === 'agent',
          });

          session!.updatedAt = Date.now();
          this.isGenerating = false;
          this.streamContent.set('');
          this.streamSub = null;
          this.storage.saveData();
          this.scrollDown();
        });
      },
    });
  }

  stopGeneration() {
    if (this.streamSub) {
      this.streamSub.unsubscribe();
      this.streamSub = null;
    }

    const text = this.streamContent();
    if (text) {
      const session = this.storage.getActiveSession();
      if (session) {
        session.messages.push({
          id: this.makeId(),
          role: 'assistant',
          content: text + '\n\n*[Stopped by user]*',
          timestamp: Date.now(),
          isAgentMode: session.mode === 'agent',
        });
        session.updatedAt = Date.now();
        this.storage.saveData();
      }
    }

    this.isGenerating = false;
    this.streamContent.set('');
  }

  private runAgentTools(content: string, sessionId: string): string {
    const toolRegex = /```tool:(\w+)\n([\s\S]*?)```/g;
    const matches: { full: string; name: string; params: string }[] = [];
    let m;

    while ((m = toolRegex.exec(content)) !== null) {
      matches.push({ full: m[0], name: m[1], params: m[2].trim() });
    }

    let cleaned = content;
    for (const match of matches) {
      try {
        const params = JSON.parse(match.params);
        const result = this.workspace.runTool(sessionId, match.name, params);
        const summary = `\n> **${match.name.replace('_', ' ')}**: ${result.result}\n`;
        cleaned = cleaned.replace(match.full, summary);
      } catch (e) {
        cleaned = cleaned.replace(match.full, `\n> Tool error\n`);
      }
    }

    return cleaned;
  }

  clearWorkspace() {
    if (confirm('Clear all agent files and terminal history for this chat?')) {
      const id = this.activeId();
      if (id) this.workspace.clearSession(id);
    }
  }

  openFile(file: VirtualFile) {
    this.viewingFile.set(file);
  }

  copyFileContent() {
    const file = this.viewingFile();
    if (file?.content) {
      navigator.clipboard.writeText(file.content).then(() => {
      });
    }
  }

  exportChat() {
    const session = this.storage.getActiveSession();
    if (!session) return;

    const markdown = session.messages
      .map((m) => {
        const role = m.role === 'user' ? '**User**' : '**Vektor**';
        return `### ${role} — ${new Date(m.timestamp).toLocaleString()}\n\n${m.content}\n\n---\n`;
      })
      .join('\n');

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private scrollDown() {
    requestAnimationFrame(() => {
      const box = document.getElementById('chat-box');
      if (box) box.scrollTop = box.scrollHeight;
    });
  }

  private makeId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  }
}
