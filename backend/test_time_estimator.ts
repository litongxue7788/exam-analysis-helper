// =================================================================================
// 智能时长估算器测试
// =================================================================================

import { getTimeEstimator } from './core/time-estimator';

async function testTimeEstimator() {
  console.log('🧪 开始测试智能时长估算器...\n');

  const estimator = getTimeEstimator();

  // 测试1: 基础估算功能
  console.log('📊 测试1: 基础估算功能');
  const factors1 = {
    imageCount: 3,
    provider: 'doubao',
    hasOcrText: false
  };

  const result1 = estimator.estimateAnalysisTime(factors1);
  console.log(`  输入: ${factors1.imageCount}张图片, ${factors1.provider}, OCR: ${factors1.hasOcrText}`);
  console.log(`  估算: ${result1.estimatedSeconds}秒 (置信度: ${result1.confidence})`);
  console.log(`  分解: 基础${result1.breakdown.baseTime}s + 图片${result1.breakdown.imageTime}s + 调整${result1.breakdown.historyAdjustment}s`);
  console.log('');

  // 测试2: 不同服务商对比
  console.log('📊 测试2: 不同服务商对比');
  const providers = ['doubao', 'aliyun', 'zhipu'];
  for (const provider of providers) {
    const factors = { imageCount: 4, provider, hasOcrText: false };
    const result = estimator.estimateAnalysisTime(factors);
    console.log(`  ${provider}: ${result.estimatedSeconds}秒 (调整: ${result.breakdown.providerAdjustment}s)`);
  }
  console.log('');

  // 测试3: OCR文本影响
  console.log('📊 测试3: OCR文本影响');
  const withoutOcr = estimator.estimateAnalysisTime({ imageCount: 2, provider: 'doubao', hasOcrText: false });
  const withOcr = estimator.estimateAnalysisTime({ imageCount: 2, provider: 'doubao', hasOcrText: true });
  console.log(`  无OCR: ${withoutOcr.estimatedSeconds}秒`);
  console.log(`  有OCR: ${withOcr.estimatedSeconds}秒 (差异: ${withOcr.estimatedSeconds - withoutOcr.estimatedSeconds}s)`);
  console.log('');

  // 测试4: 历史数据学习
  console.log('📊 测试4: 历史数据学习');
  console.log('  添加历史数据...');
  
  // 模拟一些历史数据
  const historyData = [
    { imageCount: 3, duration: 120, provider: 'doubao', success: true },
    { imageCount: 3, duration: 115, provider: 'doubao', success: true },
    { imageCount: 3, duration: 125, provider: 'doubao', success: true },
    { imageCount: 4, duration: 160, provider: 'doubao', success: true },
    { imageCount: 4, duration: 155, provider: 'doubao', success: true },
    { imageCount: 2, duration: 85, provider: 'aliyun', success: true },
    { imageCount: 2, duration: 90, provider: 'aliyun', success: true },
  ];

  for (const data of historyData) {
    estimator.recordAnalysis(data.imageCount, data.duration, data.provider, data.success);
  }

  // 重新估算，应该受历史数据影响
  const afterHistory = estimator.estimateAnalysisTime({ imageCount: 3, provider: 'doubao', hasOcrText: false });
  console.log(`  学习前: ${result1.estimatedSeconds}秒`);
  console.log(`  学习后: ${afterHistory.estimatedSeconds}秒 (历史调整: ${afterHistory.breakdown.historyAdjustment}s)`);
  console.log(`  置信度: ${result1.confidence} → ${afterHistory.confidence}`);
  console.log('');

  // 测试5: 进度更新点
  console.log('📊 测试5: 进度更新点');
  const updatePoints = estimator.getProgressUpdatePoints(120);
  console.log(`  120秒任务的更新点: ${updatePoints.join('s, ')}s`);
  console.log('');

  // 测试6: 剩余时间更新
  console.log('📊 测试6: 剩余时间更新');
  const originalEstimate = 120;
  const testCases = [
    { elapsed: 30, progress: 0.3 },
    { elapsed: 60, progress: 0.6 },
    { elapsed: 90, progress: 0.8 }
  ];

  for (const testCase of testCases) {
    const remaining = estimator.updateRemainingTime(originalEstimate, testCase.elapsed, testCase.progress);
    console.log(`  进度${(testCase.progress * 100).toFixed(0)}% (${testCase.elapsed}s): 剩余${remaining}s`);
  }
  console.log('');

  // 测试7: 统计信息
  console.log('📊 测试7: 统计信息');
  const stats = estimator.getStatistics();
  console.log(`  总分析次数: ${stats.totalAnalyses}`);
  console.log(`  平均准确性: ${(stats.averageAccuracy * 100).toFixed(1)}%`);
  console.log('  服务商统计:');
  for (const [provider, stat] of Object.entries(stats.providerStats)) {
    console.log(`    ${provider}: ${stat.count}次, 平均${stat.avgDuration.toFixed(1)}s, 成功率${(stat.successRate * 100).toFixed(1)}%`);
  }
  console.log('');

  // 测试8: 边界情况
  console.log('📊 测试8: 边界情况');
  const edgeCases = [
    { imageCount: 0, provider: 'doubao', hasOcrText: false },
    { imageCount: 1, provider: 'doubao', hasOcrText: false },
    { imageCount: 10, provider: 'doubao', hasOcrText: false },
    { imageCount: 3, provider: 'unknown', hasOcrText: false }
  ];

  for (const edgeCase of edgeCases) {
    const result = estimator.estimateAnalysisTime(edgeCase);
    console.log(`  ${edgeCase.imageCount}张图片, ${edgeCase.provider}: ${result.estimatedSeconds}秒`);
  }

  console.log('\n✅ 智能时长估算器测试完成！');
}

// 运行测试
if (require.main === module) {
  testTimeEstimator().catch(console.error);
}

export { testTimeEstimator };