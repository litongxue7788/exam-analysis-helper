// =================================================================================
// 错题本核心数据结构 (Error Ledger Types)
// 对应 Phase 2: V2.0 规划
// =================================================================================

export type ErrorTag = '#粗心' | '#计算错误' | '#概念不清' | '#审题不清' | string;

export type ErrorType = 'calculation' | 'concept' | 'reading' | 'application' | 'other';

export interface ErrorItem {
  id: string;
  // 题目来源信息
  sourceExamId: string;
  sourceExamName: string;
  createTime: string; // ISO Date string

  // 题目内容
  questionImage?: string; // 题目截图 URL
  questionText?: string;  // 题目文本 (OCR结果)
  
  // 错误分析
  studentAnswer?: string; // 学生错误答案
  correctAnswer?: string; // 正确答案
  analysis?: string;      // 错误原因分析
  
  // 结构化标签
  knowledgePoints: string[]; // 关联知识点
  errorType: ErrorType;      // 错误类型分类
  tags: ErrorTag[];          // 自定义标签
  
  // 掌握程度 tracking
  masteryLevel: number;      // 0-100, 初始通常较低
  reviewCount: number;       // 复习次数
  lastReviewDate?: string;   // 上次复习时间
  
  // 状态
  isResolved: boolean;       // 是否已攻克
}

export interface ErrorLedgerStats {
  totalErrors: number;
  resolvedCount: number;
  bySubject: Record<string, number>; // 按学科统计
  byErrorType: Record<ErrorType, number>; // 按错误类型统计
}
