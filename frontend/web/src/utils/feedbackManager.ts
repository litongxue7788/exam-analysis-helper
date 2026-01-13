// =================================================================================
// 反馈管理器 (Feedback Manager)
// 处理用户反馈的提交、缓存和同步
// =================================================================================

import { FeedbackData } from '../components/FeedbackForm';

const PENDING_FEEDBACKS_KEY = 'pending_feedbacks';
const FEEDBACK_HISTORY_KEY = 'feedback_history';
const MAX_HISTORY_SIZE = 50;

export interface CachedFeedback extends FeedbackData {
  timestamp: number;
  synced: boolean;
}

/**
 * 提交反馈到服务器
 */
export async function submitFeedback(
  data: FeedbackData,
  accessCode?: string
): Promise<void> {
  const response = await fetch('/api/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessCode ? { 'x-access-code': accessCode } : {}),
    },
    body: JSON.stringify({
      ...data,
      timestamp: Date.now(),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '提交失败' }));
    throw new Error(error.message || '提交失败');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || '提交失败');
  }
}

/**
 * 缓存反馈到本地（离线支持）
 */
export function cacheFeedback(data: FeedbackData): void {
  try {
    const cached = localStorage.getItem(PENDING_FEEDBACKS_KEY) || '[]';
    const feedbacks: CachedFeedback[] = JSON.parse(cached);
    
    feedbacks.push({
      ...data,
      timestamp: Date.now(),
      synced: false,
    });

    localStorage.setItem(PENDING_FEEDBACKS_KEY, JSON.stringify(feedbacks));
    console.log('✅ 反馈已缓存到本地');
  } catch (error) {
    console.error('❌ 缓存反馈失败:', error);
  }
}

/**
 * 获取待同步的反馈
 */
export function getPendingFeedbacks(): CachedFeedback[] {
  try {
    const cached = localStorage.getItem(PENDING_FEEDBACKS_KEY) || '[]';
    return JSON.parse(cached);
  } catch (error) {
    console.error('❌ 读取待同步反馈失败:', error);
    return [];
  }
}

/**
 * 同步待提交的反馈
 */
export async function syncPendingFeedbacks(accessCode?: string): Promise<{
  success: number;
  failed: number;
}> {
  const pending = getPendingFeedbacks();
  if (pending.length === 0) {
    return { success: 0, failed: 0 };
  }

  let successCount = 0;
  let failedCount = 0;
  const remaining: CachedFeedback[] = [];

  for (const feedback of pending) {
    if (feedback.synced) {
      continue;
    }

    try {
      await submitFeedback(feedback, accessCode);
      successCount++;
      
      // 标记为已同步
      feedback.synced = true;
    } catch (error) {
      console.error('同步反馈失败:', error);
      failedCount++;
      remaining.push(feedback);
    }
  }

  // 更新本地缓存（只保留未同步的）
  localStorage.setItem(PENDING_FEEDBACKS_KEY, JSON.stringify(remaining));

  console.log(`✅ 反馈同步完成: 成功 ${successCount}, 失败 ${failedCount}`);
  return { success: successCount, failed: failedCount };
}

/**
 * 清除已同步的反馈
 */
export function clearSyncedFeedbacks(): void {
  try {
    const pending = getPendingFeedbacks();
    const remaining = pending.filter(f => !f.synced);
    localStorage.setItem(PENDING_FEEDBACKS_KEY, JSON.stringify(remaining));
    console.log('✅ 已清除已同步的反馈');
  } catch (error) {
    console.error('❌ 清除反馈失败:', error);
  }
}

/**
 * 保存反馈到历史记录
 */
export function saveFeedbackToHistory(data: FeedbackData): void {
  try {
    const history = getFeedbackHistory();
    
    history.unshift({
      ...data,
      timestamp: Date.now(),
      synced: true,
    });

    // 限制历史记录大小
    const trimmed = history.slice(0, MAX_HISTORY_SIZE);
    
    localStorage.setItem(FEEDBACK_HISTORY_KEY, JSON.stringify(trimmed));
    console.log('✅ 反馈已保存到历史记录');
  } catch (error) {
    console.error('❌ 保存反馈历史失败:', error);
  }
}

/**
 * 获取反馈历史记录
 */
export function getFeedbackHistory(): CachedFeedback[] {
  try {
    const history = localStorage.getItem(FEEDBACK_HISTORY_KEY) || '[]';
    return JSON.parse(history);
  } catch (error) {
    console.error('❌ 读取反馈历史失败:', error);
    return [];
  }
}

/**
 * 清除反馈历史记录
 */
export function clearFeedbackHistory(): void {
  try {
    localStorage.removeItem(FEEDBACK_HISTORY_KEY);
    console.log('✅ 反馈历史已清除');
  } catch (error) {
    console.error('❌ 清除反馈历史失败:', error);
  }
}

/**
 * 检查用户是否已提交过反馈
 */
export function hasSubmittedFeedback(jobId?: string): boolean {
  if (!jobId) return false;
  
  const history = getFeedbackHistory();
  return history.some(f => f.jobId === jobId);
}

/**
 * 获取反馈统计
 */
export function getFeedbackStats(): {
  total: number;
  pending: number;
  synced: number;
  byType: Record<string, number>;
  averageRating: number;
} {
  const history = getFeedbackHistory();
  const pending = getPendingFeedbacks();
  
  const byType: Record<string, number> = {};
  let totalRating = 0;
  let ratingCount = 0;

  history.forEach(f => {
    byType[f.type] = (byType[f.type] || 0) + 1;
    if (f.rating) {
      totalRating += f.rating;
      ratingCount++;
    }
  });

  return {
    total: history.length,
    pending: pending.filter(f => !f.synced).length,
    synced: history.filter(f => f.synced).length,
    byType,
    averageRating: ratingCount > 0 ? totalRating / ratingCount : 0,
  };
}

/**
 * 导出反馈数据（用于调试或数据分析）
 */
export function exportFeedbackData(): string {
  const history = getFeedbackHistory();
  const pending = getPendingFeedbacks();
  
  const data = {
    history,
    pending,
    stats: getFeedbackStats(),
    exportTime: new Date().toISOString(),
  };

  return JSON.stringify(data, null, 2);
}

/**
 * 初始化反馈管理器（在应用启动时调用）
 */
export function initFeedbackManager(accessCode?: string): void {
  // 尝试同步待提交的反馈
  if (navigator.onLine) {
    syncPendingFeedbacks(accessCode).catch(error => {
      console.error('初始化同步失败:', error);
    });
  }

  // 监听网络状态变化
  window.addEventListener('online', () => {
    console.log('网络已连接，开始同步反馈...');
    syncPendingFeedbacks(accessCode).catch(error => {
      console.error('自动同步失败:', error);
    });
  });
}
