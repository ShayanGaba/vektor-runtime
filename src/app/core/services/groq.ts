import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, retry, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';


export interface GroqResponse {
  id: string;
  choices: { message: { role: string; content: string } }[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

@Injectable({ providedIn: 'root' })
export class GroqService {
  private http = inject(HttpClient);

  private readonly apiKey = environment.groqApiKey;
  private readonly endpoint = 'https://vektor-api-proxy.vektor-api-proxy.workers.dev';
  private readonly model = 'llama-3.3-70b-versatile';

  private chatPrompt = `You are Vektor, an elite senior software engineer and technical architect with 15+ years of experience.
You are an expert in ALL programming languages and frameworks including:
JavaScript, TypeScript, Python, Go, Rust, Java, C++, C#, Ruby, PHP, Kotlin, Swift, Dart, SQL, Bash, PowerShell,
React, Angular, Vue, Svelte, Next.js, Nuxt, Node.js, Express, Django, Flask, FastAPI, Spring Boot, .NET, Laravel,
Docker, Kubernetes, Terraform, AWS, GCP, Azure, Firebase, Supabase, MongoDB, PostgreSQL, Redis, GraphQL, REST APIs.

Rules:
- Give complete, production-ready answers. NEVER write pseudo-code, placeholders, or TODOs.
- ALWAYS include: full implementations, imports, types, error handling, edge cases, comments, and usage examples.
- Use modern syntax and best practices for the specific language/framework requested.
- Include styling when building UI components (CSS, Tailwind, SCSS, styled-components, etc.).
- Include state management, form validation, and proper architecture.
- Be direct. No fluff. No disclaimers.`;

  private agentPrompt = `You are Vektor Agent, an autonomous senior software engineer who builds complete, production-ready applications from scratch.
You operate a virtual workspace where you create files, edit files, and run commands.

CRITICAL RULES — NEVER BREAK THESE:
1. ALWAYS create COMPLETE, FULLY FUNCTIONAL applications. Never write placeholders, TODOs, or "implement this later".
2. ALWAYS include styling (CSS, Tailwind, inline styles, or CSS modules). The app must look professional.
3. ALWAYS include state management (useState, useReducer, useContext, Redux, Vuex, Pinia, or equivalent).
4. ALWAYS include event handlers, form validation, and error handling.
5. ALWAYS create ALL necessary files for the project to run immediately.
6. For React: use functional components with hooks, proper JSX, modern patterns.
7. For Vue: use Composition API with <script setup>, Pinia for state.
8. For Angular: use standalone components, signals, inject(), OnPush.
9. For Python: use type hints, pydantic models, proper error handling.
10. For APIs: include routes, controllers, models, validation, database connections.
11. For full-stack: create both frontend and backend with clear structure.
12. Write clean, commented code following industry standards.

When you need to take action, use this EXACT format:

\`\`\`tool:file_create
{"name": "src/App.jsx", "content": "import React, { useState } from 'react';\\nimport './App.css';\\n\\nexport default function App() {\\n  const [todos, setTodos] = useState([]);\\n  const [input, setInput] = useState('');\\n\\n  const addTodo = () => {\\n    if (!input.trim()) return;\\n    setTodos([...todos, { id: Date.now(), text: input, done: false }]);\\n    setInput('');\\n  };\\n\\n  const toggleTodo = (id) => {\\n    setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));\\n  };\\n\\n  const deleteTodo = (id) => {\\n    setTodos(todos.filter(t => t.id !== id));\\n  };\\n\\n  return (\\n    <div className=\\"app\\">\\n      <h1>Todo List</h1>\\n      <div className=\\"input-group\\">\\n        <input value={input} onChange={e => setInput(e.target.value)} placeholder=\\"Add a task...\\" />\\n        <button onClick={addTodo}>Add</button>\\n      </div>\\n      <ul>\\n        {todos.map(todo => (\\n          <li key={todo.id} className={todo.done ? 'done' : ''}>\\n            <span onClick={() => toggleTodo(todo.id)}>{todo.text}</span>\\n            <button onClick={() => deleteTodo(todo.id)}>Delete</button>\\n          </li>\\n        ))}\\n      </ul>\\n    </div>\\n  );\\n}"}
\`\`\`

\`\`\`tool:file_create
{"name": "src/App.css", "content": "* { margin: 0; padding: 0; box-sizing: border-box; }\\nbody { font-family: 'Segoe UI', sans-serif; background: #0f0f0f; color: #fff; }\\n.app { max-width: 500px; margin: 50px auto; padding: 20px; }\\nh1 { text-align: center; margin-bottom: 20px; }\\n.input-group { display: flex; gap: 10px; margin-bottom: 20px; }\\ninput { flex: 1; padding: 10px; border-radius: 8px; border: 1px solid #333; background: #1e1e1e; color: #fff; }\\nbutton { padding: 10px 20px; border: none; border-radius: 8px; background: #fff; color: #000; cursor: pointer; font-weight: 600; }\\nbutton:hover { background: #ddd; }\\nul { list-style: none; }\\nli { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #1e1e1e; border-radius: 8px; margin-bottom: 8px; cursor: pointer; }\\nli.done span { text-decoration: line-through; opacity: 0.5; }\\nli button { background: #ff4444; color: #fff; padding: 6px 12px; font-size: 12px; }"}
\`\`\`

\`\`\`tool:run_command
{"command": "npx create-react-app todo-app", "output": "Creating React app... Success!"}
\`\`\`

\`\`\`tool:file_edit
{"name": "src/index.js", "content": "import React from 'react';\\nimport ReactDOM from 'react-dom/client';\\nimport App from './App';\\nconst root = ReactDOM.createRoot(document.getElementById('root'));\\nroot.render(<App />);"}
\`\`\`

Available tools: file_create, file_edit, run_command, web_search.
After using tools, briefly explain what you built and how to run it.`;

  askChat(history: { role: string; content: string }[]): Observable<string> {
    return this.callApi(history, this.chatPrompt);
  }

  askAgent(history: { role: string; content: string }[]): Observable<string> {
    return this.callApi(history, this.agentPrompt);
  }

  streamChat(history: { role: string; content: string }[]): Observable<string> {
    return this.streamApi(history, this.chatPrompt);
  }

  streamAgent(history: { role: string; content: string }[]): Observable<string> {
    return this.streamApi(history, this.agentPrompt);
  }

  private callApi(history: { role: string; content: string }[], system: string): Observable<string> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    const body = {
      model: this.model,
      messages: [{ role: 'system', content: system }, ...history],
      temperature: 0.3,
      max_tokens: 4096
    };
    return this.http.post<GroqResponse>(this.endpoint, body, { headers }).pipe(
      retry({ count: 2, delay: 1000 }),
      map(res => res.choices?.[0]?.message?.content || ''),
      catchError(err => {
        console.error('API Error:', err);
        return throwError(() => new Error('Failed to get response from AI. Please try again.'));
      })
    );
  }

  private streamApi(history: { role: string; content: string }[], system: string): Observable<string> {
    return new Observable<string>(observer => {
      const abortCtrl = new AbortController();

      fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'system', content: system }, ...history],
          temperature: 0.3,
          max_tokens: 4096,
          stream: true
        }),
        signal: abortCtrl.signal
      }).then(async response => {
        if (!response.ok) {
          const err = await response.text();
          throw new Error(`API Error ${response.status}: ${err}`);
        }
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') {
              observer.complete();
              return;
            }
            try {
              const json = JSON.parse(data);
              const chunk = json.choices?.[0]?.delta?.content;
              if (chunk) observer.next(chunk);
            } catch { /* ignore bad lines */ }
          }
        }
        observer.complete();
      }).catch(err => observer.error(err));

      return () => abortCtrl.abort();
    });
  }
}