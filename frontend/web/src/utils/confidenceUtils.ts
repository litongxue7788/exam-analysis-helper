// =================================================================================
// 置信度工具函数 (Confidence Utils)
// 提供置信度相关的计算和显示逻辑
// =================================================================================

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'very-low';

export interface ConfidenceInfo {
  level: ConfidenceLevel;
  color: string;
  backgroundColor: string;
  borderColor: string;
  label: string;
  description: string;
  icon: string;
}

/**
 * 根据置信度数值判断等级
 */
export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.6) return 'medium';
  if (confidence >= 0.4) return 'low';
  return 'very-low';
}

/**
 * 获取置信度颜色
 */
export function getConfidenceColor(level: ConfidenceLevel): string {
  const colors: Record<ConfidenceLevel, string> = {
    high: '#10b981',      // 绿色
    medium: '#f59e0b',    // 黄色
    low: '#ef4444',       // 红色
    'very-low': '#dc2626' // 深红色
  };
  return colors[level];
}

/**
 * 获取置信度背景色
 */
export function getConfidenceBackgroundColor(level: ConfidenceLevel): string {
  const colors: Record<ConfidenceLevel, string> = {
    high: '#E8F5E9',      // 浅绿色
    medium: '#FFF8E1',    // 浅黄色
    low: '#FFEBEE',       // 浅红色
    'very-low': '#FFCDD2' // 浅深红色
  };
  return colors[level];
}

/**
 * 获取置信度边框色
 */
export function getConfidenceBorderColor(level: ConfidenceLevel): string {
  const colors: Record<ConfidenceLevel, string> = {
    high: '#C8E6C9',      // 中绿色
    medium: '#FFE082',    // 中黄色
    low: '#FFCDD2',       // 中红色
    'very-low': '#EF9A9A' // 中深红色
  };
  return colors[level];
}

/**
 * 获取置信度标签
 */
export function getConfidenceLabel(level: ConfidenceLevel): string {
  const labels: Record<ConfidenceLevel, string> = {
    high: '高置信度',
    medium: '中等置信度',
    low: '低置信度',
    'very-low': '极低置信度'
  };
  return labels[level];
}

/**
 * 获取置信度描述
 */
export function getConfidenceDescription(level: ConfidenceLevel): string {
  const descriptions: Record<ConfidenceLevel, string> = {
    high: '分析结果可靠，可以直接使用',
    medium: '分析结果基本可靠，建议核对',
    low: '分析结果不够可靠，建议人工复核',
    'very-low': '分析结果可能不准确，强烈建议人工复核'
  };
  return descriptions[level];
}

/**
 * 获取置信度图标
 */
export function getConfidenceIcon(level: ConfidenceLevel): string {
  const icons: Record<ConfidenceLevel, string> = {
    high: '✓',
    medium: '!',
    low: '⚠',
    'very-low': '✕'
  };
  return icons[level];
}

/**
 * 获取完整的置信度信息
 */
export function getConfidenceInfo(confidence: number): ConfidenceInfo {
  const level = getConfidenceLevel(confidence);
  
  return {
    level,
    color: getConfidenceColor(level),
    backgroundColor: getConfidenceBackgroundColor(level),
    borderColor: getConfidenceBorderColor(level),
    label: getConfidenceLabel(level),
    description: getConfidenceDescription(level),
    icon: getConfidenceIcon(level),
  };
}

/**
 * 格式化置信度百分比
 */
export function formatConfidencePercent(confidence: number): string {
  const percent = Math.round(confidence * 100);
  return `${percent}%`;
}

/**
 * 判断是否需要显示警告
 */
export function shouldShowWarning(confidence: number): boolean {
  return confidence < 0.6;
}

/**
 * 判断是否需要显示严重警告
 */
export function shouldShowCriticalWarning(confidence: number): boolean {
  return confidence < 0.4;
}

/**
 * 获取警告级别
 */
export function getWarningLevel(confidence: number): 'none' | 'warning' | 'critical' {
  if (confidence >= 0.6) return 'none';
  if (confidence >= 0.4) return 'warning';
  return 'critical';
}

/**
 * 计算平均置信度
 */
export function calculateAverageConfidence(confidences: number[]): number {
  if (confidences.length === 0) return 0;
  const sum = confidences.reduce((acc, val) => acc + val, 0);
  return sum / confidences.length;
}

/**
 * 查找最低置信度
 */
export function findLowestConfidence(confidences: number[]): number {
  if (confidences.length === 0) return 1;
  return Math.min(...confidences);
}

/**
 * 查找最高置信度
 */
export function findHighestConfidence(confidences: number[]): number {
  if (confidences.length === 0) return 0;
  return Math.max(...confidences);
}

/**
 * 统计各置信度等级的数量
 */
export function countConfidenceLevels(confidences: number[]): Record<ConfidenceLevel, number> {
  const counts: Record<ConfidenceLevel, number> = {
    high: 0,
    medium: 0,
    low: 0,
    'very-low': 0,
  };

  confidences.forEach(confidence => {
    const level = getConfidenceLevel(confidence);
    counts[level]++;
  });

  return counts;
}

/**
 * 判断整体置信度是否可接受
 */
export function isConfidenceAcceptable(confidences: number[], threshold: number = 0.6): boolean {
  const average = calculateAverageConfidence(confidences);
  const lowest = findLowestConfidence(confidences);
  
  // 平均置信度和最低置信度都要达标
  return average >= threshold && lowest >= threshold * 0.7;
}
