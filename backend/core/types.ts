// =================================================================================
// 核心数据模型定义
// 这里定义了我们系统中所有“数据”长什么样
// =================================================================================

/**
 * 1. 学生基本信息
 * 对应 Excel 表格的前几列
 */
export interface Student {
  name: string;      // 姓名
  id?: string;       // 学号（可选）
  stage: '小学' | '初中' | '高中'; // 学段
  grade: string;     // 年级（如：三年级、七年级）
  class: string;     // 班级
}

/**
 * 2. 考试基本信息
 */
export interface ExamInfo {
  subject: string;   // 学科（如：数学）
  title: string;     // 考试名称（如：期中考试）
  date: string;      // 考试时间（YYYY-MM-DD）
  fullScore: number; // 试卷满分
}

/**
 * 3. 题目结构定义
 * 对应“题目结构表”的每一行
 */
export interface QuestionStructure {
  no: string;            // 题号（如 "1", "2", "3"）
  subNo?: string;        // 小题号（如 "1(1)"，可选）
  score: number;         // 该题满分
  type: string;          // 题型（单选、填空、解答...）
  knowledgePoint: string;// 知识点
  abilityType: string;   // 能力类型（计算、逻辑、应用...）
}

/**
 * 4. 成绩记录
 * 对应“学生成绩表”的每一行数据
 */
export interface ScoreRecord {
  totalScore: number;         // 总分
  classRank?: number;         // 班级排名
  diffFromLast?: number;      // 相比上次进步/退步分数
  
  // 每道题的具体得分
  // key 是题号 (如 "1", "2")，value 是得分
  questionScores: Record<string, number>;
}

/**
 * 5. 班级统计数据
 * 这些数据通常由后台计算出来，或者从 Excel 统计行读取
 */
export interface ClassStatistics {
  averageScore: number;  // 班级平均总分
  studentCount: number;  // 班级人数
  
  // 每道题的班级平均分
  questionAverages: Record<string, number>;
  
  // 每个知识点的班级平均得分率 (0~1 之间的小数)
  knowledgePointRates: Record<string, number>;
}
