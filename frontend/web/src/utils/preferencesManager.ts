// =================================================================================
// 用户偏好管理工具 (preferencesManager.ts)
// =================================================================================
// 功能: 记住用户的历史选择，智能应用默认值
// 存储: localStorage
// =================================================================================

// 用户偏好数据结构
export interface UserPreferences {
  // 学生信息偏好
  lastStudentInfo?: {
    name: string;
    grade: string;
    subject: string;
    className: string;
  };
  
  // 考试信息偏好（按学科分组）
  examPreferences: {
    [subject: string]: {
      examName: string;           // 最近的考试名称
      frequency: number;          // 使用频率
      lastUsed: string;           // 最后使用时间
    };
  };
  
  // 大模型配置偏好
  llmPreferences?: {
    provider: string;
    modelId: string;
  };
  
  // 其他偏好
  autoAnalysis?: boolean;         // 是否自动分析
  autoSaveHistory?: boolean;      // 是否自动保存历史
}

const PREFERENCES_KEY = 'userPreferences';

/**
 * 获取用户偏好
 * @returns UserPreferences
 */
export const getPreferences = (): UserPreferences => {
  try {
    const saved = localStorage.getItem(PREFERENCES_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('读取用户偏好失败:', error);
  }
  
  // 默认偏好
  return {
    examPreferences: {},
    autoAnalysis: true,
    autoSaveHistory: true,
  };
};

/**
 * 保存用户偏好
 * @param preferences 用户偏好
 */
export const savePreferences = (preferences: UserPreferences): void => {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('保存用户偏好失败:', error);
  }
};

/**
 * 更新学生信息偏好
 * @param studentInfo 学生信息
 */
export const updateStudentInfoPreference = (studentInfo: {
  name: string;
  grade: string;
  subject: string;
  className: string;
}): void => {
  const preferences = getPreferences();
  preferences.lastStudentInfo = studentInfo;
  savePreferences(preferences);
};

/**
 * 更新考试信息偏好
 * @param subject 学科
 * @param examName 考试名称
 */
export const updateExamPreference = (subject: string, examName: string): void => {
  const preferences = getPreferences();
  
  if (!preferences.examPreferences[subject]) {
    preferences.examPreferences[subject] = {
      examName,
      frequency: 1,
      lastUsed: new Date().toISOString(),
    };
  } else {
    preferences.examPreferences[subject].examName = examName;
    preferences.examPreferences[subject].frequency += 1;
    preferences.examPreferences[subject].lastUsed = new Date().toISOString();
  }
  
  savePreferences(preferences);
};

/**
 * 获取推荐的考试名称（基于学科）
 * @param subject 学科
 * @returns string | null
 */
export const getRecommendedExamName = (subject: string): string | null => {
  const preferences = getPreferences();
  const examPref = preferences.examPreferences[subject];
  
  if (examPref) {
    return examPref.examName;
  }
  
  return null;
};

/**
 * 获取推荐的学生信息
 * @returns object | null
 */
export const getRecommendedStudentInfo = (): {
  name: string;
  grade: string;
  subject: string;
  className: string;
} | null => {
  const preferences = getPreferences();
  return preferences.lastStudentInfo || null;
};

/**
 * 更新大模型配置偏好
 * @param provider 提供商
 * @param modelId 模型ID
 */
export const updateLLMPreference = (provider: string, modelId: string): void => {
  const preferences = getPreferences();
  preferences.llmPreferences = { provider, modelId };
  savePreferences(preferences);
};

/**
 * 获取推荐的大模型配置
 * @returns object | null
 */
export const getRecommendedLLMConfig = (): {
  provider: string;
  modelId: string;
} | null => {
  const preferences = getPreferences();
  return preferences.llmPreferences || null;
};

/**
 * 智能匹配相似试卷
 * @param currentExamName 当前考试名称
 * @param currentSubject 当前学科
 * @returns object | null 匹配的偏好设置
 */
export const matchSimilarExam = (
  currentExamName: string,
  currentSubject: string
): {
  examName: string;
  confidence: number;  // 匹配置信度 (0-1)
} | null => {
  const preferences = getPreferences();
  const examPref = preferences.examPreferences[currentSubject];
  
  if (!examPref) {
    return null;
  }
  
  // 简单的相似度匹配（基于关键词）
  const keywords = ['期中', '期末', '月考', '周测', '单元', '模拟', '联考'];
  const currentKeywords = keywords.filter(kw => currentExamName.includes(kw));
  const savedKeywords = keywords.filter(kw => examPref.examName.includes(kw));
  
  // 计算匹配度
  const commonKeywords = currentKeywords.filter(kw => savedKeywords.includes(kw));
  const confidence = commonKeywords.length > 0 
    ? commonKeywords.length / Math.max(currentKeywords.length, savedKeywords.length)
    : 0;
  
  if (confidence > 0.5) {
    return {
      examName: examPref.examName,
      confidence,
    };
  }
  
  return null;
};

/**
 * 获取最常用的学科
 * @returns string | null
 */
export const getMostUsedSubject = (): string | null => {
  const preferences = getPreferences();
  const subjects = Object.entries(preferences.examPreferences);
  
  if (subjects.length === 0) {
    return null;
  }
  
  // 按使用频率排序
  subjects.sort((a, b) => b[1].frequency - a[1].frequency);
  
  return subjects[0][0];
};

/**
 * 获取最近使用的学科
 * @returns string | null
 */
export const getRecentlyUsedSubject = (): string | null => {
  const preferences = getPreferences();
  const subjects = Object.entries(preferences.examPreferences);
  
  if (subjects.length === 0) {
    return null;
  }
  
  // 按最后使用时间排序
  subjects.sort((a, b) => {
    const timeA = new Date(a[1].lastUsed).getTime();
    const timeB = new Date(b[1].lastUsed).getTime();
    return timeB - timeA;
  });
  
  return subjects[0][0];
};

/**
 * 清除所有偏好
 */
export const clearAllPreferences = (): void => {
  try {
    localStorage.removeItem(PREFERENCES_KEY);
  } catch (error) {
    console.error('清除用户偏好失败:', error);
  }
};

/**
 * 导出偏好数据（用于备份）
 * @returns string JSON字符串
 */
export const exportPreferences = (): string => {
  const preferences = getPreferences();
  return JSON.stringify(preferences, null, 2);
};

/**
 * 导入偏好数据（用于恢复）
 * @param data JSON字符串
 * @returns boolean 是否成功
 */
export const importPreferences = (data: string): boolean => {
  try {
    const preferences = JSON.parse(data);
    savePreferences(preferences);
    return true;
  } catch (error) {
    console.error('导入用户偏好失败:', error);
    return false;
  }
};
