// =================================================================================
// 证据验证测试
// 测试证据验证器的功能
// =================================================================================

import { getEvidenceValidator } from './core/evidence-validator';

console.log('🧪 开始证据验证测试\n');

const validator = getEvidenceValidator();

// 测试用例1: 完整的证据
console.log('测试1: 完整的证据');
const completeProblems = [
  '【知识点】一次函数图像【题号】3(2)【得分】0/2【错因】读图时忽略坐标含义【证据】第2小题坐标读取与图像不一致【置信度】中【最短改法】读图时先标出横纵轴含义并写出对应点坐标',
  '【知识点】抛物线准线方程【题号】1【得分】0/5【错因】概念理解不到位【证据】第1题选择的选项与y²=8x的正确准线方程不符【置信度】中【最短改法】做题时先判断抛物线类型'
];

const result1 = validator.validateProblems(completeProblems);
console.log(`总问题数: ${result1.totalProblems}`);
console.log(`完整问题: ${result1.validProblems}`);
console.log(`不完整问题: ${result1.invalidProblems}`);
console.log(`完整率: ${result1.completenessRate.toFixed(1)}%`);
console.log(result1.completenessRate === 100 ? '✅ 通过\n' : '❌ 失败\n');

// 测试用例2: 缺少字段的证据
console.log('测试2: 缺少字段的证据');
const incompleteProblems = [
  '【知识点】一次函数图像【题号】3(2)【错因】读图时忽略坐标含义【证据】第2小题坐标读取与图像不一致', // 缺少得分、置信度、最短改法
  '【知识点】抛物线准线方程【得分】0/5【错因】概念理解不到位【证据】第1题选择的选项不符' // 缺少题号、置信度、最短改法
];

const result2 = validator.validateProblems(incompleteProblems);
console.log(`总问题数: ${result2.totalProblems}`);
console.log(`完整问题: ${result2.validProblems}`);
console.log(`不完整问题: ${result2.invalidProblems}`);
console.log(`完整率: ${result2.completenessRate.toFixed(1)}%`);

if (result2.issues.length > 0) {
  console.log('\n不完整的问题详情:');
  result2.issues.forEach((issue, index) => {
    console.log(`  问题 ${index + 1}:`);
    console.log(`    缺失字段: ${issue.missingFields.join(', ')}`);
    console.log(`    无效字段: ${issue.invalidFields.join(', ')}`);
  });
}
console.log(result2.invalidProblems === 2 ? '✅ 通过\n' : '❌ 失败\n');

// 测试用例3: 得分格式错误
console.log('测试3: 得分格式错误');
const invalidScoreProblems = [
  '【知识点】一次函数【题号】1【得分】0分【错因】计算错误【证据】第1题答案错误【置信度】高【最短改法】重新计算', // 得分格式错误
  '【知识点】二次函数【题号】2【得分】3-5【错因】步骤不完整【证据】第2题缺少步骤【置信度】中【最短改法】补充步骤' // 得分格式错误
];

const result3 = validator.validateProblems(invalidScoreProblems);
console.log(`总问题数: ${result3.totalProblems}`);
console.log(`完整问题: ${result3.validProblems}`);
console.log(`不完整问题: ${result3.invalidProblems}`);

if (result3.issues.length > 0) {
  console.log('\n格式错误详情:');
  result3.issues.forEach((issue, index) => {
    console.log(`  问题 ${index + 1}:`);
    console.log(`    无效字段: ${issue.invalidFields.join(', ')}`);
  });
}
console.log(result3.invalidProblems === 2 ? '✅ 通过\n' : '❌ 失败\n');

// 测试用例4: 置信度无效值
console.log('测试4: 置信度无效值');
const invalidConfidenceProblems = [
  '【知识点】函数【题号】1【得分】0/5【错因】错误【证据】答案错误【置信度】很高【最短改法】重做', // 置信度无效
  '【知识点】方程【题号】2【得分】2/5【错因】错误【证据】计算错误【置信度】一般【最短改法】检查' // 置信度无效
];

const result4 = validator.validateProblems(invalidConfidenceProblems);
console.log(`总问题数: ${result4.totalProblems}`);
console.log(`完整问题: ${result4.validProblems}`);
console.log(`不完整问题: ${result4.invalidProblems}`);

if (result4.issues.length > 0) {
  console.log('\n置信度错误详情:');
  result4.issues.forEach((issue, index) => {
    console.log(`  问题 ${index + 1}:`);
    console.log(`    无效字段: ${issue.invalidFields.join(', ')}`);
  });
}
console.log(result4.invalidProblems === 2 ? '✅ 通过\n' : '❌ 失败\n');

// 测试用例5: 生成验证报告
console.log('测试5: 生成验证报告');
const mixedProblems = [
  '【知识点】完整问题【题号】1【得分】5/5【错因】无【证据】全对【置信度】高【最短改法】继续保持',
  '【知识点】缺少字段【题号】2【错因】错误【证据】有问题', // 缺少得分、置信度、最短改法
  '【知识点】格式错误【题号】3【得分】错了【错因】错误【证据】有问题【置信度】很低【最短改法】改正' // 得分和置信度格式错误
];

const result5 = validator.validateProblems(mixedProblems);
const report = validator.generateReport(result5);
console.log(report);
console.log(result5.validProblems === 1 && result5.invalidProblems === 2 ? '✅ 通过\n' : '❌ 失败\n');

// 测试用例6: 生成修复提示
console.log('测试6: 生成修复提示');
const fixPrompt = validator.generateFixPrompt(result5);
console.log('修复提示:');
console.log(fixPrompt);
console.log(fixPrompt.length > 0 ? '✅ 通过\n' : '❌ 失败\n');

// 测试用例7: 判断是否需要重新生成
console.log('测试7: 判断是否需要重新生成');
const shouldRegenerate1 = validator.shouldRegenerate(result1, 80); // 100% 完整率
const shouldRegenerate2 = validator.shouldRegenerate(result5, 80); // 33% 完整率
console.log(`完整率100%，需要重新生成: ${shouldRegenerate1} (期望: false)`);
console.log(`完整率33%，需要重新生成: ${shouldRegenerate2} (期望: true)`);
console.log(!shouldRegenerate1 && shouldRegenerate2 ? '✅ 通过\n' : '❌ 失败\n');

console.log('🎉 所有测试完成！');
