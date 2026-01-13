// =================================================================================
// 历史记录管理工具
// =================================================================================

export interface HistoryRecord {
  id: string;
  timestamp: string;
  studentInfo: {
    name: string;
    grade: string;
    subject: string;
    examName: string;
  };
  summary: {
    totalScore: number;
    fullScore: number;
    classAverage?: number;
    classRank?: number;
    totalStudents?: number;
    scoreChange?: number;
    overview?: string;
    strongestKnowledge?: string;
    weakestKnowledge?: string;
  };
  thumbnail?: string; // Base64 缩略图
  // ✅ 完整报告数据（用于恢复详细内容）
  fullData?: {
    typeAnalysis?: any[];
    modules?: {
      evaluation?: string[];
      problems?: any[];
      keyErrors?: any[];
      advice?: {
        content?: string[];
        habit?: string[];
      };
    };
    paperAppearance?: any;
    practiceQuestions?: string[];
    practicePaper?: any;
    acceptanceQuiz?: any;
    review?: any;
    studyMethods?: any;
    recognition?: any;
    job?: any;
  };
}

const STORAGE_KEY = 'exam_history';
const MAX_RECORDS = 20; // 最多保存 20 条记录

/**
 * 获取所有历史记录
 */
export const getHistory = (): HistoryRecord[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const records = JSON.parse(saved);
    return Array.isArray(records) ? records : [];
  } catch (error) {
    console.error('读取历史记录失败:', error);
    return [];
  }
};

/**
 * 保存历史记录
 * @returns 新记录的 ID
 */
export const saveHistory = (record: Omit<HistoryRecord, 'id' | 'timestamp'>): string => {
  try {
    const history = getHistory();
    
    const newId = `exam-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newRecord: HistoryRecord = {
      ...record,
      id: newId,
      timestamp: new Date().toISOString(),
    };
    
    // 添加到开头
    history.unshift(newRecord);
    
    // 限制数量
    const trimmed = history.slice(0, MAX_RECORDS);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    
    return newId;
  } catch (error) {
    console.error('保存历史记录失败:', error);
    return '';
  }
};

/**
 * 更新现有历史记录（用于分析完成后更新完整数据）
 */
export const updateHistory = (id: string, updates: Partial<Omit<HistoryRecord, 'id' | 'timestamp'>>): void => {
  try {
    const history = getHistory();
    const index = history.findIndex(record => record.id === id);
    
    if (index >= 0) {
      history[index] = {
        ...history[index],
        ...updates,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    }
  } catch (error) {
    console.error('更新历史记录失败:', error);
  }
};

/**
 * 删除历史记录
 */
export const deleteHistory = (id: string): void => {
  try {
    const history = getHistory();
    const filtered = history.filter(record => record.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('删除历史记录失败:', error);
  }
};

/**
 * 清空所有历史记录
 */
export const clearHistory = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('清空历史记录失败:', error);
  }
};

/**
 * 生成缩略图（从图片 URL 或 Canvas）
 */
export const generateThumbnail = async (imageUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxSize = 200; // 缩略图最大尺寸
        
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法创建 Canvas 上下文'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
        resolve(thumbnail);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };
    
    img.src = imageUrl;
  });
};
