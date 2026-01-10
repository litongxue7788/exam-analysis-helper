import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export const LatexRenderer = ({ text }: { text: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // 0. 全局预处理：修复常见的非标准 LaTeX 和 LLM 缩写
    // - 将 \f{ 替换为 \frac{ (处理大模型简写)
    // - 将 \f\frac 替换为 \frac (处理重复前缀)
    // - 将 \div 这种已经是命令的保留
    let processed = String(text || '')
       .replace(/\u0000/g, '') // 去除空字符
       // 修复 LLM 输出的奇怪 \f 前缀
       .replace(/\\f\s*\\frac/g, '\\frac') // \f\frac -> \frac
       .replace(/\\f\{/g, '\\frac{')       // \f{...} -> \frac{...}
       .replace(/\\f\s*([0-9a-zA-Z])/g, '\\frac $1') // \f3 -> \frac 3 (极少见但防御一下)
       // 修复中文引号可能导致的干扰（视情况而定，这里暂不处理）
       ;

    // 1. 智能分段逻辑
    // 目标：把字符串切分成 [中文/普通文本] + [公式片段] + [中文/普通文本]...
    // 策略：
    // - 识别明确的公式标记：$...$, $$...$$, \(...\), \[...\]
    // - 识别裸露的 LaTeX 命令串：例如 "x = \frac{1}{2}" 这种没包裹的情况
    // - 利用中文作为自然分隔符

    // 如果文本中包含明确的定界符，优先使用定界符分割
    const hasDelimiters = /[\$\\]/.test(processed) && /(\$\$|\$|\\\(|\\\[)/.test(processed);
    
    let segments: { content: string; isMath: boolean; displayMode: boolean }[] = [];

    if (hasDelimiters) {
        // 使用定界符分割
        const parts = processed.split(/(\\\\\[.*?\\\\\]|\\\\[.*?\\\\]|\\\\\(.*?\\\\\)|\\\(.*?\\\)|(?:\$\$[\s\S]*?\$\$)|(?:\$[^\$]+?\$))/s);
        segments = parts.map(part => {
            if (
                (part.startsWith('\\[') && part.endsWith('\\]')) || 
                (part.startsWith('\\\[') && part.endsWith('\\\]')) ||
                (part.startsWith('$$') && part.endsWith('$$'))
            ) {
                return {
                    content: part.replace(/^(\\\\\[|\\\\[|\$\$)\s*/, '').replace(/\s*(\\\\\]|\\\\]|\$\$)$/, ''),
                    isMath: true,
                    displayMode: true
                };
            } else if (
                (part.startsWith('\\(') && part.endsWith('\\)')) || 
                (part.startsWith('\\\\(') && part.endsWith('\\\\)')) ||
                (part.startsWith('$') && part.endsWith('$'))
            ) {
                return {
                    content: part.replace(/^(\\\\\[|\\\(|\$)\s*/, '').replace(/\s*(\\\\\]|\\\)|\$)$/, ''),
                    isMath: true,
                    displayMode: false
                };
            } else {
                return { content: part, isMath: false, displayMode: false };
            }
        });
    } else {
        // 没有定界符的“裸”文本，尝试启发式分割
        // 正则解释：
        // 匹配一段连续的：
        // 1. 以反斜杠开头的命令 (e.g. \frac{1}{2}, \pi)
        // 2. 数学运算符 (=, +, <, >)
        // 3. 包含数字和字母的组合，且周围没有中文
        // 这是一个难点，为了安全起见，我们采用“非中文片段识别法”
        
        // 简单方案：按中文（及中文标点）切分，剩下的片段如果包含 LaTeX 特征字符（\ 或 = 或 ^ 或 _），则尝试渲染
        const chunks = processed.split(/([\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]+)/);
        segments = chunks.map(chunk => {
            // 如果是中文，直接文本
            if (/[\u4e00-\u9fa5]/.test(chunk)) {
                return { content: chunk, isMath: false, displayMode: false };
            }
            // 如果包含明显的 LaTeX 特征
            if (/\\[a-zA-Z]+|[\^_{}=<>]/.test(chunk)) {
                // 进一步清洗：去掉可能的前后多余空格，但保留中间的
                return { content: chunk, isMath: true, displayMode: false };
            }
            // 否则当作普通文本（例如纯数字或英文单词）
            return { content: chunk, isMath: false, displayMode: false };
        });
    }

    // 2. 渲染
    containerRef.current.innerHTML = '';
    
    segments.forEach(seg => {
        if (!seg.content) return;

        if (seg.isMath) {
            const span = document.createElement('span');
            // 二次清洗公式内容
            let math = seg.content
                // 1. 修复 \f\frac 这种怪异组合 (大模型幻觉)
                .replace(/\\f\s*(\\frac)/g, '$1') 
                .replace(/\\f\s*(\{)/g, '\\frac$1') // \f{...} -> \frac{...}
                
                // 2. 修复 \oldSymbol{...} -> ...
                .replace(/\\oldSymbol\{([^}]+)\}/g, '$1')
                .replace(/\\oldstylenums\{([^}]+)\}/g, '$1')

                // 3. 修复丢失反斜杠的 imes (乘号)
                // 匹配规则：数字/小数点/括号 后面紧跟 imes，或者 imes 后面紧跟数字
                .replace(/([0-9.)])\s*imes\b/g, '$1\\times ')
                .replace(/\bimes\s*([0-9.(])/g, '\\times $1')
                
                // 4. 修复丢失反斜杠的 div (除号)
                .replace(/([0-9.)])\s*div\b/g, '$1\\div ')
                .replace(/\bdiv\s*([0-9.(])/g, '\\div $1')

                // 5. 其他常规清理
                .replace(/\\?rac\{/g, '\\frac{')
                .replace(/×/g, '\\times')
                .replace(/÷/g, '\\div');
            
            try {
                 katex.render(math, span, {
                     throwOnError: true, // 改为 true，主动捕获错误以便降级
                     displayMode: seg.displayMode,
                     output: 'html',
                     strict: false
                 });
                 containerRef.current?.appendChild(span);
             } catch (e) {
                 // 兜底：渲染失败时，回退为显示清洗后的纯文本，而不是红色报错
                 // 同时尝试去除 LaTeX 命令残留，让文本更可读
                 span.textContent = math
                    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2') // \frac{a}{b} -> a/b
                    .replace(/\\times/g, '×')
                    .replace(/\\div/g, '÷')
                    .replace(/\\pi/g, 'π')
                    .replace(/\\[a-zA-Z]+/g, ''); // 去掉其他所有命令
                 containerRef.current?.appendChild(span);
             }
        } else {
            // 普通文本
            const span = document.createElement('span');
            span.textContent = seg.content;
            containerRef.current?.appendChild(span);
        }
    });

  }, [text]);

  return <div ref={containerRef} style={{ display: 'inline-block' }} />;
};
