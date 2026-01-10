import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export const LatexRenderer = ({ text }: { text: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // 0. 启发式修复：针对 LLM 常见的反斜杠丢失问题进行补全
    // 这里的正则要非常小心，避免误伤正常文本
    // 比如 "imes" -> "\times", "rac{" -> "\frac{", "pi" -> "\pi" (当它单独出现或在公式语境下)
    // 考虑到我们无法完美区分公式边界，我们采取一种激进但通常安全的策略：
    // 如果看到 `imes `，大概率是 `\times `；如果看到 `rac{`，几乎必然是 `\frac{`
    
    const controlCharsRe = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

    let processed = String(text || '')
       .replace(controlCharsRe, '')
       .replace(/\\f(?=\\)/g, '')
       // 修复 \times (乘号) - 移除 \b，改用非字母判定，兼容 3.14imes15
       .replace(/([^a-zA-Z\\]|^)imes([^a-zA-Z]|$)/g, '$1\\times$2')
       
       // 修复 \frac (分数) - 移除对前导字符的依赖，强行修复 rac{
       .replace(/\\?rac\{/g, '\\frac{')
       
       // 修复 \pi (圆周率) - 允许数字紧跟 (2pi)
       .replace(/([^a-zA-Z\\]|^)pi([^a-zA-Z]|$)/g, '$1\\pi$2')
       
       // 修复 \div (除号)
       .replace(/([^a-zA-Z\\]|^)div([^a-zA-Z]|$)/g, '$1\\div$2')
       
       // 修复 \Delta
       .replace(/([^a-zA-Z\\]|^)Delta([^a-zA-Z]|$)/g, '$1\\Delta$2')
       
       // 修复 \sqrt
       .replace(/([^a-zA-Z\\]|^)sqrt\b/g, '$1\\sqrt')
       
       // 修复 \approx
       .replace(/([^a-zA-Z\\]|^)approx\b/g, '$1\\approx')
       
       // 修复 \le, \ge
       .replace(/([^a-zA-Z\\]|^)le\b/g, '$1\\le')
       .replace(/([^a-zA-Z\\]|^)ge\b/g, '$1\\ge');
       
    // 1. 分割逻辑
    // 兼容 \( ... \) 和 \[ ... \] 以及 \\( ... \\) 和 \\[ ... \\]
    // 还有 $$ ... $$ 和 $ ... $
    const parts = processed.split(/(\\\\\[.*?\\\\\]|\\\[.*?\\\]|\\\\\(.*?\\\\\)|\\\(.*?\\\)|(?:\$\$[\s\S]*?\$\$)|(?:\$[^\$]*?\$))/s);
    
    containerRef.current.innerHTML = '';
    
    parts.forEach(part => {
      let displayMode = false;
      let math = '';
      let isMath = false;

      // 匹配 \[ ... \] 或 \\[ ... \\] 或 $$ ... $$
      if (
        (part.startsWith('\\[') && part.endsWith('\\]')) || 
        (part.startsWith('\\\\[') && part.endsWith('\\\\]')) ||
        (part.startsWith('$$') && part.endsWith('$$'))
      ) {
        displayMode = true;
        isMath = true;
        // 去掉首尾标记
        math = part
          .replace(/^(\\\\\[|\\\[|\$\$)\s*/, '')
          .replace(/\s*(\\\\\]|\\\]|\$\$)$/, '');
      }
      // 匹配 \( ... \) 或 \\( ... \\) 或 $ ... $
      else if (
        (part.startsWith('\\(') && part.endsWith('\\)')) || 
        (part.startsWith('\\\\(') && part.endsWith('\\\\)')) ||
        (part.startsWith('$') && part.endsWith('$'))
      ) {
        displayMode = false;
        isMath = true;
        math = part
          .replace(/^(\\\\\(|\\\(|\$)\s*/, '')
          .replace(/\s*(\\\\\)|\\\)|\$)$/, '');
      }

      if (isMath) {
        // 2. 公式内部再次进行深度清洗（针对公式内部的反斜杠丢失）
        // 例如： 3 imes 4 -> 3 \times 4
        let cleanMath = math
           .replace(controlCharsRe, '')
           .replace(/\\f(?=\\)/g, '')
           .replace(/([^a-zA-Z\\]|^)imes([^a-zA-Z]|$)/g, '$1\\times$2')
           .replace(/\\?rac\{/g, '\\frac{')
           .replace(/([^a-zA-Z\\]|^)div([^a-zA-Z]|$)/g, '$1\\div$2')
           .replace(/([^a-zA-Z\\]|^)pi([^a-zA-Z]|$)/g, '$1\\pi$2')
           .replace(/([^a-zA-Z\\]|^)cdot([^a-zA-Z]|$)/g, '$1\\cdot$2')
           // 修复 ^2, ^3 前面可能出现的空格问题
           .replace(/(\w)\s+\^/g, '$1^')
           .replace(/[−–—]/g, '-')
           .replace(/×/g, '\\times')
           .replace(/÷/g, '\\div');

        const span = document.createElement(displayMode ? 'div' : 'span');
        try {
          katex.render(cleanMath, span, { 
            throwOnError: false, 
            displayMode,
            output: 'html',
            trust: true
          });
        } catch (e) {
          span.innerText = part;
        }
        containerRef.current?.appendChild(span);
      } else {
        const tokenParts = String(part || '').split(/(\\frac\{[^}]+\}\{[^}]+\}|\\sqrt\{[^}]+\}|\\(?:times|div|pi|cdot|Delta|approx|le|ge)\b)/g);
        tokenParts.forEach((t) => {
          if (!t) return;
          const isToken = t.startsWith('\\');
          if (!isToken) {
            const span = document.createElement('span');
            span.innerText = t;
            containerRef.current?.appendChild(span);
            return;
          }

          const span = document.createElement('span');
          try {
            katex.render(
              t
                .replace(controlCharsRe, '')
                .replace(/\\f(?=\\)/g, '')
                .replace(/\\?rac\{/g, '\\frac{'),
              span,
              { throwOnError: false, displayMode: false, output: 'html', trust: true }
            );
          } catch (e) {
            span.innerText = t;
          }
          containerRef.current?.appendChild(span);
        });
      }
    });
  }, [text]);

  return <div ref={containerRef} style={{ display: 'inline' }} />;
};
