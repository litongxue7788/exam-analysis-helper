// =================================================================================
// 分享管理工具
// =================================================================================

export interface ShareData {
  studentName: string;
  grade: string;
  subject: string;
  examName: string;
  score: number;
  fullScore: number;
}

/**
 * 生成分享链接
 */
export const generateShareLink = (examId: string): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/share/${examId}`;
};

/**
 * 复制到剪贴板
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    // 优先使用现代 Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // 降级方案：使用 execCommand
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    
    return success;
  } catch (error) {
    console.error('复制到剪贴板失败:', error);
    return false;
  }
};

/**
 * 生成分享文本
 */
export const generateShareText = (data: ShareData): string => {
  const { studentName, grade, subject, examName, score, fullScore } = data;
  const percentage = Math.round((score / fullScore) * 100);
  
  return `📊 ${studentName} 的 ${examName} 成绩报告

📚 年级：${grade}
📖 学科：${subject}
✨ 成绩：${score}/${fullScore} (${percentage}%)

查看完整报告 👇`;
};

/**
 * 生成分享卡片（用于社交媒体）
 */
export const generateShareCard = (data: ShareData): string => {
  const { studentName, grade, subject, examName, score, fullScore } = data;
  const percentage = Math.round((score / fullScore) * 100);
  
  return `
╔═══════════════════════════╗
║   📊 考试成绩分析报告   ║
╠═══════════════════════════╣
║ 学生：${studentName.padEnd(20, ' ')}║
║ 年级：${grade.padEnd(20, ' ')}║
║ 学科：${subject.padEnd(20, ' ')}║
║ 考试：${examName.padEnd(20, ' ')}║
║ 成绩：${score}/${fullScore} (${percentage}%)${' '.repeat(Math.max(0, 14 - `${score}/${fullScore} (${percentage}%)`.length))}║
╚═══════════════════════════╝
  `.trim();
};

/**
 * 检查是否支持 Web Share API
 */
export const isWebShareSupported = (): boolean => {
  return 'share' in navigator;
};

/**
 * 使用 Web Share API 分享
 */
export const shareViaWebShare = async (data: ShareData, url: string): Promise<boolean> => {
  if (!isWebShareSupported()) {
    return false;
  }
  
  try {
    await navigator.share({
      title: `${data.studentName} 的 ${data.examName} 成绩报告`,
      text: generateShareText(data),
      url: url,
    });
    return true;
  } catch (error) {
    // 用户取消分享不算错误
    if ((error as Error).name === 'AbortError') {
      return false;
    }
    console.error('Web Share API 分享失败:', error);
    return false;
  }
};
