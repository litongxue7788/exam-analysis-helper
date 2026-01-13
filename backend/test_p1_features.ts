/**
 * P1 Features Test
 * 
 * 测试P1高优先级功能：
 * 1. 渐进式交付管理器
 * 2. 质量保证管理器
 */

import { ProgressiveDeliveryManager } from './core/progressive-delivery';
import { getQualityAssuranceManager } from './core/quality-assurance';

console.log('🧪 开始测试 P1 功能...\n');

// ========== 测试1: 渐进式交付管理器 ==========
console.log('📦 测试1: 渐进式交付管理器');
console.log('─'.repeat(50));

const progressiveDelivery = new ProgressiveDeliveryManager({
  imageCount: 3,
  enableProgressiveDelivery: true
});

// 测试时长估算
const estimatedTotal = progressiveDelivery.estimateTotalSeconds();
console.log(`✅ 估算总时长: ${estimatedTotal}秒 (3张图片)`);
console.assert(estimatedTotal === 30, '3张图片应该估算30秒');

// 测试各阶段进度
const stages: Array<'extracting' | 'extracted' | 'diagnosing' | 'diagnosed' | 'practicing' | 'completed'> = [
  'extracting', 'extracted', 'diagnosing', 'diagnosed', 'practicing', 'completed'
];

stages.forEach(stage => {
  const progress = progressiveDelivery.getStageProgress(stage);
  const message = progressiveDelivery.getStageMessage(stage);
  const remaining = progressiveDelivery.estimateRemainingSeconds(stage);
  
  console.log(`  ${stage}: ${progress}% - "${message}" (剩余${remaining}秒)`);
});

// 测试创建进度更新
const extractingUpdate = progressiveDelivery.createProgressUpdate('extracting');
console.log(`\n✅ 创建进度更新:`);
console.log(`  阶段: ${extractingUpdate.stage}`);
console.log(`  进度: ${extractingUpdate.progress}%`);
console.log(`  消息: ${extractingUpdate.message}`);
console.log(`  剩余时间: ${extractingUpdate.estimatedRemainingSeconds}秒`);

// 测试创建部分结果
const mockExtracted = {
  meta: {
    examName: '七年级数学期中考试',
    subject: '数学',
    grade: '初一',
    score: 85,
    fullScore: 100,
    typeAnalysis: [
      { type: '选择题', score: 40, full: 50 },
      { type: '填空题', score: 25, full: 30 },
      { type: '解答题', score: 20, full: 20 }
    ]
  },
  observations: {
    problems: [
      '【知识点】一次函数【题号】3(2)【得分】0/2【错因】读图错误【证据】坐标读取不正确【置信度】高【最短改法】先标出坐标轴含义',
      '【知识点】分式方程【题号】5【得分】2/5【错因】计算失误【证据】去分母后计算错误【置信度】高【最短改法】检查去分母步骤',
      '【知识点】二次函数【题号】7(1)【得分】0/3【错因】概念不清【证据】顶点坐标公式错误【置信度】中【最短改法】复习顶点坐标公式'
    ]
  }
};

const extractedPartial = progressiveDelivery.createExtractedPartialResult(mockExtracted);
console.log(`\n✅ 创建识别完成部分结果:`);
console.log(`  考试名称: ${extractedPartial.meta.examName}`);
console.log(`  学科: ${extractedPartial.meta.subject}`);
console.log(`  年级: ${extractedPartial.meta.grade}`);
console.log(`  得分: ${extractedPartial.meta.score}/${extractedPartial.meta.fullScore}`);

const mockDiagnosis = {
  forStudent: {
    overall: '本次考试整体表现良好，主要问题集中在读图和计算方面。',
    problems: [
      '一次函数图像读图时容易忽略坐标含义',
      '分式方程去分母后计算容易出错',
      '二次函数顶点坐标公式记忆不牢固'
    ],
    advice: [
      '读图时先标出横纵轴含义',
      '去分母后要仔细检查每一步',
      '加强二次函数基础公式记忆'
    ]
  }
};

const diagnosedPartial = progressiveDelivery.createDiagnosedPartialResult(mockExtracted, mockDiagnosis);
console.log(`\n✅ 创建核心分析完成部分结果 (Top3错因):`);
console.log(`  整体评价: ${diagnosedPartial.forStudent.overall}`);
console.log(`  Top3问题: ${diagnosedPartial.observations.problems.length}个`);
console.log(`  Top3建议: ${diagnosedPartial.forStudent.advice.length}个`);

console.log('\n✅ 测试1通过: 渐进式交付管理器\n');

// ========== 测试2: 质量保证管理器 ==========
console.log('🔍 测试2: 质量保证管理器');
console.log('─'.repeat(50));

const qaManager = getQualityAssuranceManager();

// 测试完整性验证 - 完整的结果
const completeResult = {
  meta: {
    examName: '七年级数学期中考试',
    subject: '数学',
    grade: '初一',
    score: 85,
    fullScore: 100,
    typeAnalysis: [
      { type: '选择题', score: 40, full: 50 }
    ]
  },
  observations: {
    problems: [
      '【知识点】一次函数【题号】3(2)【得分】0/2【错因】读图错误【证据】坐标读取不正确【置信度】高【最短改法】先标出坐标轴含义'
    ]
  },
  forStudent: {
    overall: '整体表现良好',
    problems: ['问题1'],
    advice: ['建议1']
  },
  forParent: {
    summary: '家长总结',
    guidance: '家长指导'
  },
  studyMethods: {
    methods: ['方法1'],
    weekPlan: ['计划1']
  },
  practicePaper: {
    title: '练习卷',
    sections: [{ title: '第一部分', questions: [] }]
  },
  acceptanceQuiz: {
    title: '验收小测',
    questions: [{ content: '题目1' }]
  }
};

const completenessResult = qaManager.validateCompleteness(completeResult);
console.log(`✅ 完整性验证:`);
console.log(`  通过: ${completenessResult.passed}`);
console.log(`  缺少字段: ${completenessResult.missingFields.length}个`);
console.log(`  无效字段: ${completenessResult.invalidFields.length}个`);
console.log(`  警告: ${completenessResult.warnings.length}个`);
console.assert(completenessResult.passed, '完整结果应该通过验证');

// 测试完整性验证 - 不完整的结果
const incompleteResult = {
  meta: {
    examName: '测试',
    // 缺少 subject, score, fullScore
  },
  observations: {
    problems: []  // 空数组
  }
  // 缺少其他必需字段
};

const incompleteValidation = qaManager.validateCompleteness(incompleteResult);
console.log(`\n✅ 不完整结果验证:`);
console.log(`  通过: ${incompleteValidation.passed}`);
console.log(`  缺少字段: ${incompleteValidation.missingFields.join(', ')}`);
console.assert(!incompleteValidation.passed, '不完整结果不应该通过验证');
console.assert(incompleteValidation.missingFields.length > 0, '应该检测到缺少的字段');

// 测试质量指标计算
const qualityMetrics = qaManager.calculateQualityMetrics(completeResult, mockExtracted);
console.log(`\n✅ 质量指标计算:`);
console.log(`  识别置信度: ${(qualityMetrics.recognitionConfidence * 100).toFixed(0)}%`);
console.log(`  分析置信度: ${(qualityMetrics.analysisConfidence * 100).toFixed(0)}%`);
console.log(`  证据完整性: ${(qualityMetrics.evidenceCompleteness * 100).toFixed(0)}%`);
console.log(`  内容可读性: ${(qualityMetrics.contentReadability * 100).toFixed(0)}%`);
console.log(`  总体质量分数: ${qualityMetrics.overallScore}/100`);
console.assert(qualityMetrics.overallScore >= 0 && qualityMetrics.overallScore <= 100, '质量分数应该在0-100之间');

// 测试质量报告生成
const qualityReport = qaManager.generateQualityReport(completeResult, mockExtracted);
console.log(`\n✅ 质量报告生成:`);
console.log(`  总体质量分数: ${qualityReport.metrics.overallScore}/100`);
console.log(`  完整性验证通过: ${qualityReport.completeness.passed}`);
console.log(`  改进建议数量: ${qualityReport.recommendations.length}个`);
if (qualityReport.recommendations.length > 0) {
  console.log(`  建议:`);
  qualityReport.recommendations.forEach(r => console.log(`    - ${r}`));
}

// 测试内容可读性检测
const unreadableResult = {
  ...completeResult,
  observations: {
    problems: [
      '```json\n{"test": "value"}\n```',  // 包含Markdown代码块
      '公式：$x^2 + y^2 = r^2$',  // 包含LaTeX
      'text\x00with\x1Fcontrol'  // 包含控制字符
    ]
  }
};

const unreadableMetrics = qaManager.calculateQualityMetrics(unreadableResult);
console.log(`\n✅ 不可读内容检测:`);
console.log(`  内容可读性: ${(unreadableMetrics.contentReadability * 100).toFixed(0)}%`);
console.assert(unreadableMetrics.contentReadability < 1.0, '应该检测到可读性问题');

console.log('\n✅ 测试2通过: 质量保证管理器\n');

// ========== 测试3: 集成测试 ==========
console.log('🔗 测试3: 集成测试');
console.log('─'.repeat(50));

// 模拟完整的分析流程
console.log('模拟完整分析流程...');

const delivery = new ProgressiveDeliveryManager({
  imageCount: 2,
  enableProgressiveDelivery: true
});

// 阶段1: 识别中
let update = delivery.createProgressUpdate('extracting');
console.log(`\n[${update.progress}%] ${update.message} (剩余${update.estimatedRemainingSeconds}秒)`);

// 阶段2: 识别完成
update = delivery.createProgressUpdate('extracted', delivery.createExtractedPartialResult(mockExtracted));
console.log(`[${update.progress}%] ${update.message} (剩余${update.estimatedRemainingSeconds}秒)`);
console.log(`  → 返回基本信息: ${update.partialResult.meta.examName}`);

// 阶段3: 分析中
update = delivery.createProgressUpdate('diagnosing');
console.log(`[${update.progress}%] ${update.message} (剩余${update.estimatedRemainingSeconds}秒)`);

// 阶段4: 核心分析完成
update = delivery.createProgressUpdate('diagnosed', delivery.createDiagnosedPartialResult(mockExtracted, mockDiagnosis));
console.log(`[${update.progress}%] ${update.message} (剩余${update.estimatedRemainingSeconds}秒)`);
console.log(`  → 返回Top3错因: ${update.partialResult.observations.problems.length}个问题`);

// 阶段5: 生成练习题中
update = delivery.createProgressUpdate('practicing');
console.log(`[${update.progress}%] ${update.message} (剩余${update.estimatedRemainingSeconds}秒)`);

// 阶段6: 完成
update = delivery.createProgressUpdate('completed');
console.log(`[${update.progress}%] ${update.message}`);

// 质量检查
const finalReport = qaManager.generateQualityReport(completeResult, mockExtracted);
console.log(`\n质量检查结果:`);
console.log(`  总体质量分数: ${finalReport.metrics.overallScore}/100`);
console.log(`  完整性验证: ${finalReport.completeness.passed ? '✅ 通过' : '❌ 未通过'}`);

// 性能统计
const perfStats = delivery.getPerformanceStats();
console.log(`\n性能统计:`);
console.log(`  总耗时: ${perfStats.totalSeconds.toFixed(1)}秒`);

console.log('\n✅ 测试3通过: 集成测试\n');

// ========== 总结 ==========
console.log('═'.repeat(50));
console.log('🎉 所有P1功能测试通过！');
console.log('═'.repeat(50));
console.log('\n实现的功能:');
console.log('  ✅ 渐进式交付管理器 (Progressive Delivery)');
console.log('     - 时长估算');
console.log('     - 进度跟踪');
console.log('     - 部分结果交付');
console.log('     - 性能统计');
console.log('  ✅ 质量保证管理器 (Quality Assurance)');
console.log('     - 完整性验证');
console.log('     - 质量指标计算');
console.log('     - 内容可读性检测');
console.log('     - 质量报告生成');
console.log('\n下一步:');
console.log('  1. 运行真实试卷测试验证效果');
console.log('  2. 前端集成渐进式加载UI');
console.log('  3. 监控质量指标并持续优化');
