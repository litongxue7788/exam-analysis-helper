// =================================================================================
// 错题本核心数据结构 (Error Ledger Types)
// 对应 Phase 2: V2.0 规划
// =================================================================================

export type ErrorTag = '#粗心' | '#计算错误' | '#概念不清' | '#审题不清' | string;

export type ErrorType = 'calculation' | 'concept' | 'reading' | 'application' | 'other';

export interface ErrorItem {
  id: string;
  sourceExamId: string;
  sourceExamName: string;
  createTime: string;
  questionText: string;
  knowledgePoints: string[];
  errorType: 'calculation' | 'reading' | 'concept' | 'application' | 'other';
  tags: string[];
  masteryLevel: number; // 0-100
  reviewCount: number;
  lastReviewDate?: string;
  isResolved: boolean;
}

export interface ErrorLedgerStats {
  totalErrors: number;
  resolvedCount: number;
  bySubject: Record<string, number>; // 按学科统计
  byErrorType: Record<ErrorType, number>; // 按错误类型统计
}
