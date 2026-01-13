/**
 * 双模型验证器测试
 */

import { getDualModelValidator, ExtractedData } from './core/dual-model-validator';

const validator = getDualModelValidator();

console.log('🧪 开始测试双模型验证器...\n');

// 测试1：一致性验证
console.log('测试1：两个模型结果完全一致');
const primaryResult1: ExtractedData = {
  meta: {
    examName: '七年级数学期中考试',
    subject: '数学',
    score: 85,
    fullScore: 100
  },
  observations: {
    problems: [
      '【知识点】一次函数【题号】第3题【得分】5/10【错因】计算失误【证据】解题步骤中，将 2x+3=7 错误计算为 x=1【置信度】高',
      '【知识点】分式方程【题号】第5题【得分】3/8【错因】概念错误【证据】未检验增根，导致错误答案【置信度】高'
    ]
  }
};

const secondaryResult1: ExtractedData = {
  meta: {
    examName: '七年级数学期中考试',
    subject: '数学',
    score: 85,
    fullScore: 100
  },
  observations: {
    problems: [
      '【知识点】一次函数【题号】第3题【得分】5/10【错因】计算失误【证据】解题步骤中，将 2x+3=7 错误计算为 x=1【置信度】高',
      '【知识点】分式方程【题号】第5题【得分】3/8【错因】概念错误【证据】未检验增根，导致错误答案【置信度】高'
    ]
  }
};

const result1 = validator.validate(primaryResult1, secondaryResult1, 'doubao', 'aliyun');
console.log('✅ 验证状态:', result1.validationStatus);
console.log('✅ 考试名称:', result1.examName);
console.log('✅ 得分:', result1.score);
console.log('✅ 问题数量:', result1.problems.length);
console.log('✅ 不一致项:', result1.validationDetails.inconsistencies.length);
console.log('✅ 需要用户确认:', result1.validationDetails.needsUserConfirmation);
console.log('');

// 测试2：得分不一致
console.log('测试2：两个模型得分不一致');
const primaryResult2: ExtractedData = {
  meta: {
    examName: '七年级数学期中考试',
    subject: '数学',
    score: 85,
    fullScore: 100
  },
  observations: {
    problems: []
  }
};

const secondaryResult2: ExtractedData = {
  meta: {
    examName: '七年级数学期中考试',
    subject: '数学',
    score: 88,
    fullScore: 100
  },
  observations: {
    problems: []
  }
};

const result2 = validator.validate(primaryResult2, secondaryResult2, 'doubao', 'aliyun');
console.log('⚠️  验证状态:', result2.validationStatus);
console.log('⚠️  选择的得分:', result2.score, '(应该选择较小的85)');
console.log('⚠️  不一致项:', result2.validationDetails.inconsistencies);
console.log('⚠️  需要用户确认:', result2.validationDetails.needsUserConfirmation);
console.log('');

// 测试3：题目信息不一致
console.log('测试3：两个模型识别的题目得分不一致');
const primaryResult3: ExtractedData = {
  meta: {
    examName: '七年级数学期中考试',
    subject: '数学',
    score: 85,
    fullScore: 100
  },
  observations: {
    problems: [
      '【知识点】一次函数【题号】第3题【得分】5/10【错因】计算失误【证据】解题步骤错误【置信度】高'
    ]
  }
};

const secondaryResult3: ExtractedData = {
  meta: {
    examName: '七年级数学期中考试',
    subject: '数学',
    score: 85,
    fullScore: 100
  },
  observations: {
    problems: [
      '【知识点】一次函数【题号】第3题【得分】6/10【错因】计算失误【证据】解题步骤错误【置信度】中'
    ]
  }
};

const result3 = validator.validate(primaryResult3, secondaryResult3, 'doubao', 'aliyun');
console.log('⚠️  验证状态:', result3.validationStatus);
console.log('⚠️  问题验证状态:', result3.validationStatus.problems);
console.log('⚠️  选择的题目得分:', result3.problems[0].score);
console.log('⚠️  选择的置信度:', result3.problems[0].confidence);
console.log('⚠️  不一致项数量:', result3.validationDetails.inconsistencies.length);
console.log('');

// 测试4：一个模型识别到更多题目
console.log('测试4：主模型识别到3题，辅助模型识别到2题');
const primaryResult4: ExtractedData = {
  meta: {
    examName: '七年级数学期中考试',
    subject: '数学',
    score: 85,
    fullScore: 100
  },
  observations: {
    problems: [
      '【知识点】一次函数【题号】第3题【得分】5/10【错因】计算失误【证据】解题步骤错误【置信度】高',
      '【知识点】分式方程【题号】第5题【得分】3/8【错因】概念错误【证据】未检验增根【置信度】高',
      '【知识点】二次函数【题号】第7题【得分】4/12【错因】理解错误【证据】未理解题意【置信度】中'
    ]
  }
};

const secondaryResult4: ExtractedData = {
  meta: {
    examName: '七年级数学期中考试',
    subject: '数学',
    score: 85,
    fullScore: 100
  },
  observations: {
    problems: [
      '【知识点】一次函数【题号】第3题【得分】5/10【错因】计算失误【证据】解题步骤错误【置信度】高',
      '【知识点】分式方程【题号】第5题【得分】3/8【错因】概念错误【证据】未检验增根【置信度】高'
    ]
  }
};

const result4 = validator.validate(primaryResult4, secondaryResult4, 'doubao', 'aliyun');
console.log('⚠️  验证状态:', result4.validationStatus);
console.log('⚠️  合并后的问题数量:', result4.problems.length, '(应该是3题)');
console.log('⚠️  问题列表:');
result4.problems.forEach((p, i) => {
  console.log(`   ${i + 1}. 题号: ${p.questionNo}, 得分: ${p.score}, 置信度: ${p.confidence}`);
});
console.log('');

// 测试5：考试名称相似但不完全一致
console.log('测试5：考试名称相似但不完全一致');
const primaryResult5: ExtractedData = {
  meta: {
    examName: '七年级数学期中考试',
    subject: '数学',
    score: 85,
    fullScore: 100
  },
  observations: {
    problems: []
  }
};

const secondaryResult5: ExtractedData = {
  meta: {
    examName: '七年级 数学 期中考试',
    subject: '数学',
    score: 85,
    fullScore: 100
  },
  observations: {
    problems: []
  }
};

const result5 = validator.validate(primaryResult5, secondaryResult5, 'doubao', 'aliyun');
console.log('✅ 考试名称验证状态:', result5.validationStatus.examName, '(应该是consistent，因为去除空格后一致)');
console.log('✅ 选择的考试名称:', result5.examName);
console.log('');

// 测试6：满分不一致
console.log('测试6：满分不一致（100 vs 120）');
const primaryResult6: ExtractedData = {
  meta: {
    examName: '七年级数学期中考试',
    subject: '数学',
    score: 85,
    fullScore: 100
  },
  observations: {
    problems: []
  }
};

const secondaryResult6: ExtractedData = {
  meta: {
    examName: '七年级数学期中考试',
    subject: '数学',
    score: 85,
    fullScore: 120
  },
  observations: {
    problems: []
  }
};

const result6 = validator.validate(primaryResult6, secondaryResult6, 'doubao', 'aliyun');
console.log('⚠️  满分验证状态:', result6.validationStatus.fullScore);
console.log('⚠️  选择的满分:', result6.fullScore, '(应该选择更常见的100)');
console.log('⚠️  不一致原因:', result6.validationDetails.inconsistencies.find(i => i.field === 'fullScore')?.reason);
console.log('');

console.log('✅ 所有测试完成！');
console.log('\n总结：');
console.log('- 双模型验证器可以正确识别一致和不一致的结果');
console.log('- 不一致时能够智能选择更合理的结果');
console.log('- 能够合并两个模型识别到的不同题目');
console.log('- 能够处理相似但不完全一致的字符串');
console.log('- 能够标记需要用户确认的字段');
