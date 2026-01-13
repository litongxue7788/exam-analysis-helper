// =================================================================================
// 内容清洗管道 (Content Sanitizer)
// 确保 LLM 输出内容可读、无乱码、无特殊符号
// =================================================================================

export interface ContentIssue {
  type: 'markdown' | 'latex' | 'specialChar' | 'encoding' | 'format';
  original: string;
  fixed: string;
  position: number;
}

export interface SanitizedContent {
  cleaned: string;
  issues: ContentIssue[];
  wasModified: boolean;
}

/**
 * LaTeX 公式转文字映射表
 */
const LATEX_TO_TEXT_MAP: Record<string, string> = {
  // 上标
  '^2': '²',
  '^3': '³',
  '^{2}': '²',
  '^{3}': '³',
  '^{n}': 'ⁿ',
  
  // 下标
  '_1': '₁',
  '_2': '₂',
  '_n': 'ₙ',
  '_{1}': '₁',
  '_{2}': '₂',
  '_{n}': 'ₙ',
  
  // 分数
  '\\frac{1}{2}': '½',
  '\\frac{1}{3}': '⅓',
  '\\frac{2}{3}': '⅔',
  '\\frac{1}{4}': '¼',
  '\\frac{3}{4}': '¾',
  
  // 根号
  '\\sqrt': '√',
  '\\sqrt{': '√(',
  
  // 运算符
  '\\times': '×',
  '\\div': '÷',
  '\\pm': '±',
  '\\leq': '≤',
  '\\geq': '≥',
  '\\neq': '≠',
  '\\approx': '≈',
  
  // 希腊字母
  '\\alpha': 'α',
  '\\beta': 'β',
  '\\gamma': 'γ',
  '\\delta': 'δ',
  '\\theta': 'θ',
  '\\pi': 'π',
  '\\sigma': 'σ',
  
  // 其他符号
  '\\infty': '∞',
  '\\angle': '∠',
  '\\degree': '°',
  '\\parallel': '∥',
  '\\perp': '⊥',
};

/**
 * 转换 LaTeX 公式为文字描述或 Unicode 符号
 */
function convertLatexToText(latex: string): string {
  let result = latex;
  
  // 先尝试直接映射
  for (const [latexCode, unicode] of Object.entries(LATEX_TO_TEXT_MAP)) {
    result = result.replace(new RegExp(latexCode.replace(/[\\{}]/g, '\\$&'), 'g'), unicode);
  }
  
  // 处理通用分数 \frac{a}{b}
  result = result.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, (_, numerator, denominator) => {
    return `(${numerator}/${denominator})`;
  });
  
  // 处理通用根号 \sqrt{x}
  result = result.replace(/\\sqrt\{([^}]+)\}/g, (_, content) => {
    return `√(${content})`;
  });
  
  // 处理上标 x^{n}
  result = result.replace(/([a-zA-Z0-9])\^\{([^}]+)\}/g, (_, base, exp) => {
    return `${base}^${exp}`;
  });
  
  // 处理下标 x_{n}
  result = result.replace(/([a-zA-Z0-9])_\{([^}]+)\}/g, (_, base, sub) => {
    return `${base}_${sub}`;
  });
  
  // 移除剩余的 LaTeX 命令
  result = result.replace(/\\[a-zA-Z]+/g, '');
  
  // 清理多余的花括号
  result = result.replace(/[{}]/g, '');
  
  return result.trim();
}

/**
 * 检测并修复编码问题
 */
function fixEncoding(content: string): string {
  // 移除 BOM (Byte Order Mark)
  let fixed = content.replace(/\uFEFF/g, '');
  
  // 移除零宽字符
  fixed = fixed.replace(/[\u200B-\u200D\uFEFF]/g, '');
  
  // 修复常见的编码错误（如 UTF-8 误解析）
  // 这里可以根据实际情况添加更多规则
  
  return fixed;
}

/**
 * 检测内容是否有编码问题
 */
function hasEncodingIssues(content: string): boolean {
  // 检测 BOM
  if (content.includes('\uFEFF')) return true;
  
  // 检测零宽字符
  if (/[\u200B-\u200D]/.test(content)) return true;
  
  // 检测不可见控制字符（排除常见的换行、制表符）
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/.test(content)) return true;
  
  return false;
}

/**
 * 主清洗函数
 */
export function sanitizeContent(rawContent: string): SanitizedContent {
  const issues: ContentIssue[] = [];
  let cleaned = String(rawContent || '');
  const original = cleaned;
  
  // 1. 移除 Markdown 代码块标记
  const markdownPattern = /```(?:json|javascript|typescript|python|java|cpp|c|go|rust|sql|html|css|xml|yaml|toml|ini|sh|bash|zsh|powershell|cmd)?\s*/gi;
  if (markdownPattern.test(cleaned)) {
    const before = cleaned;
    cleaned = cleaned.replace(markdownPattern, '');
    cleaned = cleaned.replace(/```\s*/g, '');
    cleaned = cleaned.replace(/`{1,3}/g, '');
    
    if (before !== cleaned) {
      issues.push({
        type: 'markdown',
        original: '```',
        fixed: '(已移除)',
        position: 0,
      });
    }
  }
  
  // 2. 转换 LaTeX 公式
  // 使用更强大的 LaTeX 检测和转换
  const latexPattern = /\$\$?([^$]+)\$\$?/g;
  const matches: Array<{ original: string; converted: string; index: number }> = [];
  
  let match;
  while ((match = latexPattern.exec(cleaned)) !== null) {
    const latexCode = match[1];
    const converted = convertLatexToText(latexCode);
    
    matches.push({
      original: match[0],
      converted,
      index: match.index
    });
    
    issues.push({
      type: 'latex',
      original: match[0],
      fixed: converted,
      position: match.index,
    });
  }
  
  // 从后往前替换，避免索引偏移问题
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    cleaned = cleaned.substring(0, m.index) + m.converted + cleaned.substring(m.index + m.original.length);
  }
  
  // 额外检查：移除任何残留的单个 $ 符号（可能是未配对的）
  cleaned = cleaned.replace(/\$+/g, '');
  
  // 3. 清理特殊字符和控制字符
  if (hasEncodingIssues(cleaned)) {
    const before = cleaned;
    cleaned = fixEncoding(cleaned);
    
    if (before !== cleaned) {
      issues.push({
        type: 'encoding',
        original: '(编码问题)',
        fixed: '(已修复)',
        position: 0,
      });
    }
  }
  
  // 移除控制字符（保留换行、制表符）
  const controlCharPattern = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;
  if (controlCharPattern.test(cleaned)) {
    const before = cleaned;
    cleaned = cleaned.replace(controlCharPattern, '');
    
    if (before !== cleaned) {
      issues.push({
        type: 'specialChar',
        original: '(控制字符)',
        fixed: '(已移除)',
        position: 0,
      });
    }
  }
  
  // 4. 规范化空白字符
  // 将多个空格合并为一个
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  
  // 将多个连续换行合并为最多两个
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // 移除行首行尾空格
  cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');
  
  // 移除首尾空白
  cleaned = cleaned.trim();
  
  // 5. 格式验证和修复
  // 确保 JSON 中的字符串不包含未转义的换行
  // （这个在 JSON.parse 之前处理）
  
  const wasModified = cleaned !== original;
  
  return {
    cleaned,
    issues,
    wasModified,
  };
}

/**
 * 验证清洗后的内容是否可读
 */
export function validateReadability(content: string): {
  isReadable: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // 检查是否还有 Markdown 标记
  if (/```/.test(content)) {
    issues.push('仍包含 Markdown 代码块标记');
  }
  
  // 检查是否还有 LaTeX 代码（更严格的检测）
  // 只检测明显的 LaTeX 模式：$...$ 或 $$...$$
  const latexMatches = content.match(/\$+[^$]+\$+/g);
  if (latexMatches && latexMatches.length > 0) {
    // 过滤掉误报：如果 $ 符号之间的内容很短且不包含 LaTeX 命令，可能是普通文本
    const realLatex = latexMatches.filter(m => {
      const inner = m.replace(/\$/g, '');
      // 如果包含反斜杠（LaTeX 命令标志）或者长度超过 20，认为是 LaTeX
      return inner.includes('\\') || inner.length > 20;
    });
    
    if (realLatex.length > 0) {
      issues.push('仍包含 LaTeX 公式代码');
    }
  }
  
  // 检查是否有控制字符
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/.test(content)) {
    issues.push('仍包含不可见控制字符');
  }
  
  // 检查是否有编码问题
  if (hasEncodingIssues(content)) {
    issues.push('仍存在编码问题');
  }
  
  return {
    isReadable: issues.length === 0,
    issues,
  };
}

/**
 * 清洗 JSON 字符串（在解析前使用）
 */
export function sanitizeJsonString(jsonStr: string): string {
  // 先进行内容清洗
  const sanitized = sanitizeContent(jsonStr);
  
  // 额外的 JSON 特定清洗
  let cleaned = sanitized.cleaned;
  
  // 移除 JSON 中的注释（虽然标准 JSON 不支持注释，但有些 LLM 会生成）
  cleaned = cleaned.replace(/\/\/[^\n]*/g, '');
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // 修复常见的 JSON 格式问题
  // 移除尾随逗号
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
  
  return cleaned;
}
