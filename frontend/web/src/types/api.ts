// =================================================================================
// 前端 API 接口定义 (与后端同步)
// =================================================================================

export interface AnalyzeExamRequest {
  // 学生信息
  student: any;
  // 考试元数据
  exam: any;
  // 该学生的具体成绩
  score: any;
  // 试卷题目结构
  questions: any[];
  // 班级整体统计情况
  classStats: any;
  // 用户选择的大模型服务商
  modelProvider: 'doubao' | 'aliyun' | 'zhipu';
  // (可选) 额外的老师评语或上下文
  teacherNote?: string;
}

export interface AnalyzeExamResponse {
  // 请求处理是否成功
  success: boolean;
  
  // 如果失败，返回错误信息
  errorMessage?: string;
  
  // 分析结果数据 (核心部分)
  data?: {
    // 成绩摘要 (用于前端展示小卡片)
    summary: {
      totalScore: number;
      rank: number;
      beatPercentage: number; // 击败了全班多少%的人
      strongestKnowledge: string; // 最强知识点
      weakestKnowledge: string;   // 最弱知识点
    };
    
    // 大模型生成的文字报告 (结构化)
    report: {
      // 学生版视角
      forStudent: {
        overall: string;       // 整体评价
        problems: string[];    // 主要问题列表
        advice: string[];      // 建议列表
      };
      
      // 家长版视角
      forParent: {
        summary: string;       // 总结
        guidance: string;      // 辅导建议
      };
    };

    // (可选) 学习方法建议（由后端大模型产出）
    studyMethods?: {
      methods: string[];
      weekPlan: string[];
    };
    
    // 原始的大模型返回文本 (用于调试或备用)
    rawLlmOutput: string;

    // (可选) 卷面观感
    paperAppearance?: {
      rating: string;
      content: string;
    };

    // (可选) 试卷名称
    examName?: string;

    // (可选) 题型分析
    typeAnalysis?: {
      type: string;
      score: number;
      full: number;
    }[];

    // (可选) 学科
    subject?: string;

    // (可选) 巩固练习题列表
    practiceQuestions?: string[];

    // (可选) 结构化练习卷
    practicePaper?: {
      title: string;
      sections: {
        name: string;
        questions: {
          no: number;
          content: string;
          hints?: string[];
        }[];
      }[];
    };

    // (可选) 低置信度复核引导
    review?: {
      required: boolean;
      reason?: string;
      suggestions?: string[];
    };

    // (可选) 验收小测
    acceptanceQuiz?: {
      title: string;
      passRule: string;
      questions: {
        no: number;
        content: string;
        hints?: string[];
      }[];
    };
  };
}
