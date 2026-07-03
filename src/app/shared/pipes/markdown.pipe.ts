import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({ name: 'markdown', standalone: true })
export class MarkdownPipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer);

  transform(value: string): SafeHtml {
    if (!value) return this.sanitizer.bypassSecurityTrustHtml('');

    let html = value;
    const codeBlocks: { placeholder: string; html: string }[] = [];
    const inlineCodes: { placeholder: string; html: string }[] = [];

    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      const placeholder = `__CODE_${codeBlocks.length}__`;
      const language = lang || 'text';
      const safeCode = this.escapeHtml(code.trim());
      const blockId = 'code-' + Math.random().toString(36).slice(2, 9);
      codeBlocks.push({
        placeholder,
        html: `<div class="my-3 rounded-xl overflow-hidden border border-white/10 bg-[#1e1e1e] group/code">
          <div class="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-white/5">
            <span class="text-xs text-gray-400 font-mono">${language}</span>
            <button onclick="navigator.clipboard.writeText(this.dataset.code); this.textContent='Copied!'; setTimeout(() => this.textContent='Copy', 2000)" data-code="${this.escapeHtmlAttr(code.trim())}" class="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors">Copy</button>
          </div>
          <pre class="p-4 overflow-x-auto text-sm text-gray-300 font-mono leading-relaxed"><code>${safeCode}</code></pre>
        </div>`
      });
      return placeholder;
    });

    html = html.replace(/`([^`]+)`/g, (match, code) => {
      const placeholder = `__INLINE_${inlineCodes.length}__`;
      inlineCodes.push({
        placeholder,
        html: `<code class="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono text-orange-300">${this.escapeHtml(code)}</code>`
      });
      return placeholder;
    });

    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-white mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-white mt-5 mb-3">$1</h2>');

    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em class="italic text-gray-300">$1</em>');

    html = html.replace(/^[\*\-]\s+(.*)/gm, '<li class="ml-4 text-gray-300 list-disc">$1</li>');

    html = html.replace(/\n/g, '<br>');

    html = html.replace(/(<li[^>]*>.*<\/li>(?:<br>)?)+/g, '<ul class="my-2 space-y-1">$&</ul>');

    for (const ic of inlineCodes) {
      html = html.replace(ic.placeholder, ic.html);
    }

    for (const cb of codeBlocks) {
      html = html.replace(cb.placeholder, cb.html);
    }

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private escapeHtmlAttr(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}