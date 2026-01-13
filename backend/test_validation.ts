// 测试试卷信息验证功能
import { extractAndValidateExamInfo, generateValidationReport } from './core/exam-info-extractor';

console.log('='.repeat(80));
console.log('测试试卷信息验证功能');
console.log('='.repeat(80));

// 测试场景1: 高中试卷 + 错误年级
console.log('\n【测试1】高中试卷 + 用户填写"三年级"');
const test1 = extractAndValidateExamInfo(
  { examName: '高一数学期中考试', subject: '数学' },
  { grade: '三年级', subject: '数学' }
);
console.log(generateValidationReport(test1));

// 测试场景2: 三年级试卷 + 用户填写"高一"
console.log('\n【测试2】三年级试卷 + 用户填写"高一"');
const test2 = extractAndValidateExamInfo(
  { examName: '三年级数学上册期中测试卷', subject: '数学' },
  { grade: '高一', subject: '数学' }
);
console.log(generateValidationReport(test2));

// 测试场景3: 三年级试卷 + 用户未填写年级
console.log('\n【测试3】三年级试卷 + 用户未填写年级');
const test3 = extractAndValidateExamInfo(
  { examName: '三年级数学上册期中测试卷', subject: '数学' },
  { subject: '数学' }
);
console.log(generateValidationReport(test3));

// 测试场景4: 高中试卷 + 用户未填写年级
console.log('\n【测试4】高中试卷 + 用户未填写年级');
const test4 = extractAndValidateExamInfo(
  { examName: '高一数学期中考试', subject: '数学' },
  { subject: '数学' }
);
console.log(generateValidationReport(test4));

console.log('\n' + '='.repeat(80));
console.log('测试完成');
console.log('='.repeat(80));
