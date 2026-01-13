// =================================================================================
// 练习题相关性验证器 (Relevance Validator)
// 验证生成的练习题与错因的相关性
// =================================================================================

export interface ProblemInfo {
  knowledge: string;
  questionNo?: string;
  errorType?: string;
  rawText: string;
}

export interface PracticeQuestion {
  no: number;
  content: string;
  hints?: string[];
}

export interface QuestionRelevance {
  questionNo: number;
  targetProblem: string;
  relevanceScore: number; // 0-1
  reason: string;
  isRelevant: boolean;
}

export interface RelevanceResult {
  overall: number; // 0-1，整体相关性得分
  questions: QuestionRelevance[];
  needsRegeneration: boolean;
}

/**
 * 从 problem 字符串中提取知识点
 */
function extractKnowledge(problemText: string): string {
  const match = problemText.match(/【知识点】([^【]+)/);
  if (match) {
    return match[1].trim();
  }
  return '';
}

/**
 * 从 problem 字符串中提取错因类型
 */
function extractErrorType(problemText: string): string {
  const match = problemText.match(/【错因】([^【]+)/);
  if (match) {
    return match[1].trim();
  }
  return '';
}

/**
 * 计算两个文本的相似度（改进的关键词匹配）
 * text1: 练习题内容（长文本）
 * text2: 知识点名称（短文本）
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  console.log(`[Relevance Debug] 知识点: "${text2}"`);
  
  // 从知识点名称（text2）中提取关键词
  // 策略：将中文按字符拆分，提取2-4字的词组
  const allKeywords: string[] = [];
  
  // 1. 提取完整的英文单词和数字
  const words = text2.match(/[a-z0-9]+/gi) || [];
  allKeywords.push(...words.filter(w => w.length > 1));
  
  // 2. 提取中文词组（2-4字）
  const chineseText = text2.replace(/[^\u4e00-\u9fa5]/g, '');
  if (chineseText.length > 0) {
    // 提取2字词组
    for (let i = 0; i <= chineseText.length - 2; i++) {
      allKeywords.push(chineseText.substring(i, i + 2));
    }
    // 提取3字词组
    for (let i = 0; i <= chineseText.length - 3; i++) {
      allKeywords.push(chineseText.substring(i, i + 3));
    }
    // 如果文本较长，也提取4字词组
    if (chineseText.length >= 4) {
      for (let i = 0; i <= chineseText.length - 4; i++) {
        allKeywords.push(chineseText.substring(i, i + 4));
      }
    }
  }
  
  // 去重
  const keywords = Array.from(new Set(allKeywords));
  
  console.log(`[Relevance Debug] 提取关键词: [${keywords.join(', ')}]`);
  
  if (keywords.length === 0) {
    console.log(`[Relevance Debug] 无关键词，返回 0`);
    return 0;
  }
  
  // 将练习题内容转为小写，便于匹配
  const text1Lower = text1.toLowerCase();
  console.log(`[Relevance Debug] 练习题内容（前100字符）: "${text1.substring(0, 100)}..."`);
  
  // 计算有多少关键词出现在练习题中
  let matchCount = 0;
  const matchedKeywords: string[] = [];
  for (const keyword of keywords) {
    if (text1Lower.includes(keyword.toLowerCase())) {
      matchCount++;
      matchedKeywords.push(keyword);
    }
  }
  
  const score = matchCount / keywords.length;
  console.log(`[Relevance Debug] 匹配关键词: [${matchedKeywords.join(', ')}]`);
  console.log(`[Relevance Debug] 匹配得分: ${matchCount}/${keywords.length} = ${(score * 100).toFixed(0)}%`);
  
  // 返回匹配比例
  return score;
}

/**
 * 验证单个练习题与错因的相关性
 */
function validateQuestionRelevance(
  question: PracticeQuestion,
  problems: ProblemInfo[]
): QuestionRelevance {
  console.log(`\n[Relevance Debug] ========== 验证练习题 ${question.no} ==========`);
  console.log(`[Relevance Debug] 练习题内容: "${question.content.substring(0, 150)}..."`);
  
  let maxScore = 0;
  let bestMatch = '';
  let bestReason = '';
  
  for (const problem of problems) {
    const knowledge = problem.knowledge;
    const errorType = problem.errorType || '';
    
    console.log(`\n[Relevance Debug] --- 对比知识点: "${knowledge}" ---`);
    
    // 计算知识点匹配度
    const knowledgeSimilarity = calculateTextSimilarity(question.content, knowledge);
    
    // 计算错因匹配度
    let errorSimilarity = 0;
    if (errorType) {
      console.log(`[Relevance Debug] --- 对比错因: "${errorType}" ---`);
      errorSimilarity = calculateTextSimilarity(question.content, errorType);
    }
    
    // 综合得分（知识点权重 0.7，错因权重 0.3）
    const score = knowledgeSimilarity * 0.7 + errorSimilarity * 0.3;
    console.log(`[Relevance Debug] 综合得分: ${(score * 100).toFixed(0)}% (知识点 ${(knowledgeSimilarity * 100).toFixed(0)}% × 0.7 + 错因 ${(errorSimilarity * 100).toFixed(0)}% × 0.3)`);
    
    if (score > maxScore) {
      maxScore = score;
      bestMatch = knowledge;
      bestReason = `知识点匹配度: ${(knowledgeSimilarity * 100).toFixed(0)}%`;
      if (errorType) {
        bestReason += `, 错因匹配度: ${(errorSimilarity * 100).toFixed(0)}%`;
      }
    }
  }
  
  console.log(`\n[Relevance Debug] 最佳匹配: "${bestMatch}", 得分: ${(maxScore * 100).toFixed(0)}%, 是否相关: ${maxScore >= 0.2}`);
  
  return {
    questionNo: question.no,
    targetProblem: bestMatch,
    relevanceScore: maxScore,
    reason: bestReason,
    isRelevant: maxScore >= 0.2, // 阈值降低到 0.2（更宽松，适应改进的匹配算法）
  };
}

/**
 * 验证练习题与错因的相关性
 */
export function validateRelevance(
  problemTexts: string[],
  practiceQuestions: PracticeQuestion[]
): RelevanceResult {
  console.log(`\n[Relevance Debug] ========== 开始相关性验证 ==========`);
  console.log(`[Relevance Debug] 问题数量: ${problemTexts.length}`);
  console.log(`[Relevance Debug] 练习题数量: ${practiceQuestions.length}`);
  
  // 打印前2个问题的原始文本
  problemTexts.slice(0, 2).forEach((text, i) => {
    console.log(`[Relevance Debug] 问题 ${i + 1} 原始文本: "${text.substring(0, 200)}..."`);
  });
  
  // 解析 problems
  const problems: ProblemInfo[] = problemTexts.map(text => ({
    knowledge: extractKnowledge(text),
    errorType: extractErrorType(text),
    rawText: text,
  }));
  
  console.log(`[Relevance Debug] 解析后的知识点:`);
  problems.forEach((p, i) => {
    console.log(`[Relevance Debug]   ${i + 1}. 知识点="${p.knowledge}", 错因="${p.errorType}"`);
  });
  
  // 验证每个练习题
  const questionRelevances = practiceQuestions.map(q => 
    validateQuestionRelevance(q, problems)
  );
  
  // 计算整体相关性
  const totalScore = questionRelevances.reduce((sum, r) => sum + r.relevanceScore, 0);
  const overall = questionRelevances.length > 0 ? totalScore / questionRelevances.length : 0;
  
  // 判断是否需要重新生成（整体相关性 < 0.6 或有超过 30% 的题目不相关）
  const irrelevantCount = questionRelevances.filter(r => !r.isRelevant).length;
  const irrelevantRatio = questionRelevances.length > 0 ? irrelevantCount / questionRelevances.length : 0;
  const needsRegeneration = overall < 0.6 || irrelevantRatio > 0.3;
  
  console.log(`\n[Relevance Debug] ========== 验证完成 ==========`);
  console.log(`[Relevance Debug] 整体相关性: ${(overall * 100).toFixed(0)}%`);
  console.log(`[Relevance Debug] 相关题目: ${questionRelevances.filter(r => r.isRelevant).length}/${questionRelevances.length}`);
  
  return {
    overall,
    questions: questionRelevances,
    needsRegeneration,
  };
}

/**
 * 从练习卷中提取所有练习题
 */
export function extractPracticeQuestions(practicePaper: any): PracticeQuestion[] {
  const questions: PracticeQuestion[] = [];
  
  if (!practicePaper || !Array.isArray(practicePaper.sections)) {
    return questions;
  }
  
  for (const section of practicePaper.sections) {
    if (!Array.isArray(section.questions)) continue;
    
    for (const q of section.questions) {
      questions.push({
        no: q.no || 0,
        content: q.content || '',
        hints: q.hints || [],
      });
    }
  }
  
  return questions;
}
