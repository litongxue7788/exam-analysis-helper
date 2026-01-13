// =================================================================================
// 错误消息管理器测试
// 验证友好错误提示功能
// =================================================================================

import { getErrorMessageManager, ErrorContext } from './core/error-message-manager';

const errorManager = getErrorMessageManager();

console.log('🧪 开始测试错误消息管理器...\n');

// 测试用例
const testCases: { name: string; context: ErrorContext; expectedCode: string }[] = [
  {
    name: '图片上传失败',
    context: { code: 'IMAGE_UPLOAD_FAILED', originalError: new Error('Upload failed') },
    expectedCode: 'ERR_IMAGE_UPLOAD'
  },
  {
    name: '图片过大',
    context: { code: 'IMAGE_TOO_LARGE', details: { size: '15MB', limit: '10MB' } },
    expectedCode: 'ERR_IMAGE_TOO_LARGE'
  },
  {
    name: '图片格式无效',
    context: { code: 'IMAGE_FORMAT_INVALID', details: { format: 'BMP' } },
    expectedCode: 'ERR_IMAGE_FORMAT'
  },
  {
    name: '未提供图片',
    context: { code: 'NO_IMAGES_PROVIDED' },
    expectedCode: 'ERR_NO_IMAGES'
  },
  {
    name: 'OCR识别失败',
    context: { code: 'OCR_FAILED', originalError: new Error('OCR service unavailable') },
    expectedCode: 'ERR_OCR_FAILED'
  },
  {
    name: 'LLM超时',
    context: { code: 'LLM_TIMEOUT', details: { timeout: 30000 } },
    expectedCode: 'ERR_LLM_TIMEOUT'
  },
  {
    name: 'LLM API错误',
    context: { code: 'LLM_API_ERROR', originalError: new Error('API key invalid') },
    expectedCode: 'ERR_LLM_API'
  },
  {
    name: 'JSON解析失败',
    context: { code: 'JSON_PARSE_FAILED', originalError: new Error('Unexpected token') },
    expectedCode: 'ERR_JSON_PARSE'
  },
  {
    name: '请求频率限制',
    context: { code: 'RATE_LIMIT_EXCEEDED', details: { limit: 10, window: '分钟', retryAfter: 60 } },
    expectedCode: 'ERR_RATE_LIMIT'
  },
  {
    name: '每日配额超限',
    context: { code: 'DAILY_QUOTA_EXCEEDED', details: { used: 100, limit: 100, resetTime: '明天0点' } },
    expectedCode: 'ERR_DAILY_QUOTA'
  },
  {
    name: '无效请求',
    context: { code: 'INVALID_REQUEST', details: { reason: '缺少必需参数' } },
    expectedCode: 'ERR_INVALID_REQUEST'
  },
  {
    name: '网络错误',
    context: { code: 'NETWORK_ERROR', originalError: new Error('ECONNREFUSED') },
    expectedCode: 'ERR_NETWORK'
  },
  {
    name: '服务器错误',
    context: { code: 'SERVER_ERROR', originalError: new Error('Internal server error') },
    expectedCode: 'ERR_SERVER'
  },
  {
    name: '证据不完整',
    context: { code: 'EVIDENCE_INCOMPLETE', details: { missingFields: ['题号', '得分'] } },
    expectedCode: 'ERR_EVIDENCE_INCOMPLETE'
  },
  {
    name: '低置信度',
    context: { code: 'LOW_CONFIDENCE', details: { confidence: 0.45 } },
    expectedCode: 'ERR_LOW_CONFIDENCE'
  }
];

let passedCount = 0;
let failedCount = 0;

for (const testCase of testCases) {
  try {
    const errorMessage = errorManager.generateErrorMessage(testCase.context);
    
    // 验证必需字段
    const hasUserMessage = errorMessage.userMessage && errorMessage.userMessage.length > 0;
    const hasTechnicalMessage = errorMessage.technicalMessage && errorMessage.technicalMessage.length > 0;
    const hasSuggestions = Array.isArray(errorMessage.suggestions) && errorMessage.suggestions.length > 0;
    const hasCorrectCode = errorMessage.errorCode === testCase.expectedCode;
    
    if (hasUserMessage && hasTechnicalMessage && hasSuggestions && hasCorrectCode) {
      console.log(`✅ ${testCase.name}`);
      console.log(`   用户消息: ${errorMessage.userMessage}`);
      console.log(`   建议数量: ${errorMessage.suggestions.length}`);
      console.log(`   错误代码: ${errorMessage.errorCode}`);
      passedCount++;
    } else {
      console.log(`❌ ${testCase.name}`);
      if (!hasUserMessage) console.log(`   缺少用户消息`);
      if (!hasTechnicalMessage) console.log(`   缺少技术消息`);
      if (!hasSuggestions) console.log(`   缺少建议`);
      if (!hasCorrectCode) console.log(`   错误代码不匹配: 期望 ${testCase.expectedCode}, 实际 ${errorMessage.errorCode}`);
      failedCount++;
    }
    console.log('');
  } catch (error) {
    console.log(`❌ ${testCase.name} - 抛出异常: ${error}`);
    failedCount++;
    console.log('');
  }
}

// 测试错误推断功能
console.log('🧪 测试错误代码推断...\n');

const inferTestCases: { name: string; error: Error; expectedCode: string }[] = [
  { name: '超时错误', error: new Error('Request timeout'), expectedCode: 'LLM_TIMEOUT' },
  { name: '网络错误', error: new Error('Network error: ECONNREFUSED'), expectedCode: 'NETWORK_ERROR' },
  { name: 'JSON错误', error: new Error('JSON parse error'), expectedCode: 'JSON_PARSE_FAILED' },
  { name: '频率限制', error: new Error('Rate limit exceeded'), expectedCode: 'RATE_LIMIT_EXCEEDED' },
  { name: '配额错误', error: new Error('Daily quota exceeded'), expectedCode: 'DAILY_QUOTA_EXCEEDED' },
  { name: '图片错误', error: new Error('Image upload failed'), expectedCode: 'IMAGE_UPLOAD_FAILED' },
  { name: 'OCR错误', error: new Error('OCR processing failed'), expectedCode: 'OCR_FAILED' },
  { name: '未知错误', error: new Error('Something went wrong'), expectedCode: 'SERVER_ERROR' }
];

for (const testCase of inferTestCases) {
  const inferredCode = errorManager.inferErrorCode(testCase.error);
  if (inferredCode === testCase.expectedCode) {
    console.log(`✅ ${testCase.name}: ${inferredCode}`);
    passedCount++;
  } else {
    console.log(`❌ ${testCase.name}: 期望 ${testCase.expectedCode}, 实际 ${inferredCode}`);
    failedCount++;
  }
}

// 测试 handleError 方法
console.log('\n🧪 测试 handleError 方法...\n');

const handleErrorTest = errorManager.handleError(new Error('Request timeout'));
if (handleErrorTest.errorCode === 'ERR_LLM_TIMEOUT') {
  console.log(`✅ handleError 正确推断超时错误`);
  passedCount++;
} else {
  console.log(`❌ handleError 推断错误: ${handleErrorTest.errorCode}`);
  failedCount++;
}

// 测试 formatErrorResponse 方法
console.log('\n🧪 测试 formatErrorResponse 方法...\n');

const testErrorMessage = errorManager.generateErrorMessage({
  code: 'IMAGE_TOO_LARGE',
  details: { size: '15MB', limit: '10MB' }
});

const formattedResponse = errorManager.formatErrorResponse(testErrorMessage);

if (
  formattedResponse.success === false &&
  formattedResponse.errorCode === 'ERR_IMAGE_TOO_LARGE' &&
  formattedResponse.errorMessage &&
  Array.isArray(formattedResponse.suggestions) &&
  formattedResponse.technicalDetails
) {
  console.log(`✅ formatErrorResponse 格式正确`);
  console.log(`   响应结构:`, JSON.stringify(formattedResponse, null, 2));
  passedCount++;
} else {
  console.log(`❌ formatErrorResponse 格式错误`);
  failedCount++;
}

// 总结
console.log('\n' + '='.repeat(60));
console.log(`测试完成: ${passedCount + failedCount} 个测试`);
console.log(`✅ 通过: ${passedCount}`);
console.log(`❌ 失败: ${failedCount}`);
console.log('='.repeat(60));

if (failedCount === 0) {
  console.log('\n🎉 所有测试通过！错误消息管理器工作正常。');
  process.exit(0);
} else {
  console.log('\n⚠️ 部分测试失败，请检查错误消息管理器实现。');
  process.exit(1);
}
