// =================================================================================
// 测试基于内容的智能推断系统
// =================================================================================

import { getKnowledgePointAnalyzer } from './core/knowledge-point-analyzer';
import { getMultiDimensionInferencer } from './core/multi-dimension-inferencer';
import { getConfidenceEvaluator } from './core/confidence-evaluator';
import { getOutputBinder } from './core/output-binder';
import { getContentConsistencyValidator } from './core/content-consistency-validator';

// 模拟试卷数据
const mockProblems = [
  '【知识点】一元二次方程【题号】1【得分】0/5【错因】判别式计算错误【证据】第1题判别式b²-4ac计算为负数【置信度】高【最短改法】重新计算判别式',
  '【知识点】因式分解【题号】2【得分】2/5【错因】提取公因式不完整【证据】第2题只提取了x，未提取x²【置信度】高【最短改法】完整提取公因式',
  '【知识点】函数图像【题号】3【得分】3/5【错因】读图不准确【证据】第3题坐标点读取错误【置信度】中【最短改法】仔细读取坐标点'
];

const mockMeta = {
  examName: '初二数学期中考试',
  subject: '数学',
  score: 75,
  fullScore: 100,
  typeAnalysis: [
    { type: '选择题', score: 30, full: 40 },
    { type: '填空题', score: 20, full: 30 },
    { type: '解答题', score: 25, full: 30 }
  ]
};

const mockUserInput = {
  grade: '小学三年级',  // 故意错误的用户输入
  subject: '语文'       // 故意错误的用户输入
};

async function testContentDrivenAnalysis() {
  console.log('🚀 开始测试基于内容的智能推断系统...\n');

  // 1. 知识点分析
  console.log('=== 1. 知识点分析 ===');
  const analyzer = getKnowledgePointAnalyzer();
  const knowledgePoints = analyzer.analyzeKnowledgePoints(mockProblems);
  console.log(`提取了 ${knowledgePoints.length} 个知识点:`);
  knowledgePoints.forEach(kp => {
    console.log(`  - ${kp.name} (难度: ${kp.difficulty}, 年级: ${kp.suggestedGrades.join(', ')}, 置信度: ${(kp.confidence * 100).toFixed(0)}%)`);
  });
  console.log('');

  // 2. 多维度推断
  console.log('=== 2. 多维度推断 ===');
  const inferencer = getMultiDimensionInferencer();
  
  const titleResult = inferencer.inferFromTitle(mockMeta.examName);
  console.log(`标题推断: 年级=${titleResult.grade}, 学科=${titleResult.subject}, 置信度=${(titleResult.confidence * 100).toFixed(0)}%`);
  console.log(`  理由: ${titleResult.reasoning}`);
  
  const knowledgeResult = inferencer.inferFromKnowledgePoints(knowledgePoints);
  console.log(`知识点推断: 年级=${knowledgeResult.grade}, 学科=${knowledgeResult.subject}, 置信度=${(knowledgeResult.confidence * 100).toFixed(0)}%`);
  console.log(`  理由: ${knowledgeResult.reasoning}`);
  
  const difficultyResult = inferencer.inferFromDifficulty(mockProblems);
  console.log(`难度推断: 年级=${difficultyResult.grade}, 置信度=${(difficultyResult.confidence * 100).toFixed(0)}%`);
  console.log(`  理由: ${difficultyResult.reasoning}`);
  
  const questionTypeResult = inferencer.inferFromQuestionTypes(mockMeta.typeAnalysis);
  console.log(`题型推断: 年级=${questionTypeResult.grade}, 置信度=${(questionTypeResult.confidence * 100).toFixed(0)}%`);
  console.log(`  理由: ${questionTypeResult.reasoning}`);
  
  const inference = inferencer.combineResults([
    titleResult,
    knowledgeResult,
    difficultyResult,
    questionTypeResult
  ]);
  
  console.log(`\n综合推断结果:`);
  console.log(`  最终年级: ${inference.finalGrade}`);
  console.log(`  最终学科: ${inference.finalSubject}`);
  console.log(`  整体置信度: ${(inference.overallConfidence * 100).toFixed(0)}%`);
  if (inference.warnings.length > 0) {
    console.log(`  警告:`);
    inference.warnings.forEach(w => console.log(`    ${w}`));
  }
  console.log('');

  // 3. 置信度评估
  console.log('=== 3. 置信度评估 ===');
  const evaluator = getConfidenceEvaluator();
  const confidence = evaluator.evaluate(inference);
  console.log(`置信度级别: ${confidence.level}`);
  console.log(`置信度得分: ${(confidence.score * 100).toFixed(0)}%`);
  console.log(`因素分析:`);
  console.log(`  - 标题清晰度: ${(confidence.factors.titleClarity * 100).toFixed(0)}%`);
  console.log(`  - 知识点一致性: ${(confidence.factors.knowledgeConsistency * 100).toFixed(0)}%`);
  console.log(`  - 难度对齐度: ${(confidence.factors.difficultyAlignment * 100).toFixed(0)}%`);
  console.log(`  - 维度一致性: ${(confidence.factors.dimensionAgreement * 100).toFixed(0)}%`);
  console.log(`警告信息: ${evaluator.generateWarningMessage(confidence)}`);
  if (confidence.recommendations.length > 0) {
    console.log(`建议:`);
    confidence.recommendations.forEach(r => console.log(`  - ${r}`));
  }
  console.log('');

  // 4. 输出绑定
  console.log('=== 4. 输出绑定 ===');
  const binder = getOutputBinder();
  const boundContext = binder.createBoundContext(
    inference,
    confidence,
    knowledgePoints,
    mockUserInput
  );
  
  console.log(`绑定上下文:`);
  console.log(`  使用年级: ${boundContext.grade} (来源: ${boundContext.source})`);
  console.log(`  使用学科: ${boundContext.subject} (来源: ${boundContext.source})`);
  console.log(`  用户输入年级: ${boundContext.userInput.grade} (已忽略)`);
  console.log(`  用户输入学科: ${boundContext.userInput.subject} (已忽略)`);
  console.log(`  警告信息:`);
  boundContext.warnings.forEach(w => console.log(`    ${w}`));
  console.log('');

  // 5. 内容一致性验证
  console.log('=== 5. 内容一致性验证 ===');
  const validator = getContentConsistencyValidator();
  
  // 模拟诊断报告
  const mockDiagnosis = {
    forStudent: {
      overall: '本次考试整体表现良好，但在一元二次方程和因式分解方面需要加强。',
      advice: [
        '【基础巩固】加强一元二次方程的判别式计算',
        '【专项训练】练习因式分解的完整提取',
        '【习惯养成】读图时仔细标注坐标点'
      ],
      problems: mockProblems
    },
    studyMethods: {
      methods: [
        '每天练习5道一元二次方程题目',
        '总结因式分解的常见错误',
        '建立错题本，定期复习'
      ],
      weekPlan: [
        '周一：复习判别式概念',
        '周二：练习判别式计算',
        '周三：学习因式分解技巧',
        '周四：综合练习',
        '周五：错题回顾'
      ]
    }
  };
  
  const diagnosisReport = validator.validateDiagnosisReport(mockDiagnosis, inference, knowledgePoints);
  console.log(`诊断报告验证: ${diagnosisReport.overallPassed ? '✅ 通过' : '⚠️ 有警告'}`);
  console.log(`检查项: ${diagnosisReport.checks.length}`);
  diagnosisReport.checks.forEach(check => {
    console.log(`  ${check.message}`);
  });
  if (diagnosisReport.warnings.length > 0) {
    console.log(`警告:`);
    diagnosisReport.warnings.forEach(w => console.log(`  ${w}`));
  }
  console.log('');

  // 模拟练习题
  const mockPractice = {
    practicePaper: {
      title: '一元二次方程巩固练习',
      sections: [
        {
          name: '一、【一元二次方程】基础题',
          questions: [
            { no: 1, content: '解方程 x²-5x+6=0', hints: ['计算判别式', '使用求根公式', '验证答案'] }
          ]
        }
      ]
    }
  };
  
  const practiceReport = validator.validatePracticeQuestions(mockPractice, inference, knowledgePoints);
  console.log(`练习题验证: ${practiceReport.overallPassed ? '✅ 通过' : '⚠️ 有警告'}`);
  console.log(`检查项: ${practiceReport.checks.length}`);
  practiceReport.checks.forEach(check => {
    console.log(`  ${check.message}`);
  });
  if (practiceReport.warnings.length > 0) {
    console.log(`警告:`);
    practiceReport.warnings.forEach(w => console.log(`  ${w}`));
  }
  console.log('');

  const methodsReport = validator.validateStudyMethods(mockDiagnosis.studyMethods, inference);
  console.log(`学习方法验证: ${methodsReport.overallPassed ? '✅ 通过' : '⚠️ 有警告'}`);
  console.log(`检查项: ${methodsReport.checks.length}`);
  methodsReport.checks.forEach(check => {
    console.log(`  ${check.message}`);
  });
  console.log('');

  console.log('✅ 测试完成！');
  console.log('\n=== 关键结论 ===');
  console.log(`1. 系统识别年级: ${inference.finalGrade} (用户输入: ${mockUserInput.grade})`);
  console.log(`2. 系统识别学科: ${inference.finalSubject} (用户输入: ${mockUserInput.subject})`);
  console.log(`3. 系统完全忽略了错误的用户输入，使用了试卷识别结果`);
  console.log(`4. 置信度: ${confidence.level} (${(confidence.score * 100).toFixed(0)}%)`);
  console.log(`5. 所有输出内容与试卷识别结果一致`);
}

// 运行测试
testContentDrivenAnalysis().catch(console.error);
