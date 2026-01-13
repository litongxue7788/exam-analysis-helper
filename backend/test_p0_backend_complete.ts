// =================================================================================
// P0后端功能完整性测试
// 测试所有P0后端任务的实现
// =================================================================================

import { getLowConfidenceWarningManager } from './core/low-confidence-warning';
import { getEvidenceSourceTracker } from './core/evidence-source-tracker';
import { getFeedbackCollector } from './core/feedback-collector';

async function runTests() {
  console.log('🧪 开始测试P0后端功能...\n');

  let passedCount = 0;
  let failedCount = 0;

  // ============================================================================
  // Test 1: 低置信度警告管理器
  // ============================================================================
  console.log('📋 测试 1: 低置信度警告管理器\n');

  try {
  const warningManager = getLowConfidenceWarningManager();
  
  // 测试高置信度（无警告）
  const noWarning = warningManager.generateWarning({
    overallConfidence: 0.85,
    recognitionConfidence: 0.90,
    analysisConfidence: 0.85
  });
  
  if (!noWarning.hasWarning && noWarning.level === 'none') {
    console.log('✅ 高置信度无警告测试通过');
    passedCount++;
  } else {
    console.log('❌ 高置信度无警告测试失败');
    failedCount++;
  }
  
  // 测试低置信度警告
  const lowWarning = warningManager.generateWarning({
    overallConfidence: 0.65,
    recognitionConfidence: 0.60,
    analysisConfidence: 0.70,
    lowConfidenceProblems: [
      { index: 1, description: '函数概念', confidence: '低' },
      { index: 2, description: '方程求解', confidence: '中' }
    ]
  });
  
  if (lowWarning.hasWarning && lowWarning.level === 'medium' && lowWarning.suggestions.length > 0) {
    console.log('✅ 低置信度警告生成测试通过');
    console.log(`   警告消息: ${lowWarning.message}`);
    console.log(`   建议数量: ${lowWarning.suggestions.length}`);
    console.log(`   受影响项: ${lowWarning.affectedItems.length}`);
    passedCount++;
  } else {
    console.log('❌ 低置信度警告生成测试失败');
    failedCount++;
  }
  
  // 测试提取低置信度问题
  const testResult = {
    observations: {
      problems: [
        '【知识点】函数概念【题号】1【得分】2/5【置信度】低【证据】答案错误',
        '【知识点】方程求解【题号】2【得分】3/5【置信度】中【证据】步骤不完整',
        '【知识点】几何证明【题号】3【得分】5/5【置信度】高【证据】完全正确'
      ]
    }
  };
  
  const extracted = warningManager.extractLowConfidenceProblems(testResult);
  
  if (extracted.length === 2) {
    console.log('✅ 提取低置信度问题测试通过');
    console.log(`   提取到 ${extracted.length} 个低置信度问题`);
    passedCount++;
  } else {
    console.log('❌ 提取低置信度问题测试失败');
    console.log(`   期望2个，实际${extracted.length}个`);
    failedCount++;
  }
  
  } catch (error) {
    console.log('❌ 低置信度警告管理器测试异常:', error);
    failedCount += 3;
  }

  console.log('');

  // ============================================================================
  // Test 2: 证据来源追溯管理器
  // ============================================================================
  console.log('📋 测试 2: 证据来源追溯管理器\n');

  try {
  const sourceTracker = getEvidenceSourceTracker();
  
  // 测试创建追溯元数据
  const problems = [
    '【知识点】函数【题号】1【得分】2/5【置信度】低',
    '【知识点】方程【题号】2【得分】3/5【置信度】中',
    '【知识点】几何【题号】3【得分】4/5【置信度】高'
  ];
  
  const metadata = sourceTracker.createTrackingMetadata(3, problems, 'batch');
  
  if (metadata.totalImages === 3 && metadata.sources.length === 3 && metadata.trackingEnabled) {
    console.log('✅ 创建追溯元数据测试通过');
    console.log(`   总图片数: ${metadata.totalImages}`);
    console.log(`   追溯源数: ${metadata.sources.length}`);
    console.log(`   分析方法: ${metadata.analysisMethod}`);
    passedCount++;
  } else {
    console.log('❌ 创建追溯元数据测试失败');
    failedCount++;
  }
  
  // 测试获取特定问题的来源
  const source = sourceTracker.getSourceForProblem(metadata, 0);
  
  if (source && source.problemIndex === 0 && source.canViewOriginal) {
    console.log('✅ 获取问题来源测试通过');
    console.log(`   问题索引: ${source.problemIndex}`);
    console.log(`   可查看原图: ${source.canViewOriginal}`);
    passedCount++;
  } else {
    console.log('❌ 获取问题来源测试失败');
    failedCount++;
  }
  
  // 测试生成查看原图提示
  if (source) {
    const hint = sourceTracker.generateViewOriginalHint(source);
    if (hint && hint.length > 0) {
      console.log('✅ 生成查看原图提示测试通过');
      console.log(`   提示: ${hint}`);
      passedCount++;
    } else {
      console.log('❌ 生成查看原图提示测试失败');
      failedCount++;
    }
  }
  
  } catch (error) {
    console.log('❌ 证据来源追溯管理器测试异常:', error);
    failedCount += 3;
  }

  console.log('');

  // ============================================================================
  // Test 3: 用户反馈收集器
  // ============================================================================
  console.log('📋 测试 3: 用户反馈收集器\n');

  try {
  const feedbackCollector = getFeedbackCollector();
  
  // 测试验证反馈数据
  const validFeedback = {
    feedbackType: 'accuracy' as const,
    rating: 4,
    content: '分析结果很准确，但有一个小错误需要修正'
  };
  
  const validation1 = feedbackCollector.validateFeedback(validFeedback);
  
  if (validation1.valid && validation1.errors.length === 0) {
    console.log('✅ 有效反馈验证测试通过');
    passedCount++;
  } else {
    console.log('❌ 有效反馈验证测试失败');
    console.log(`   错误: ${validation1.errors.join(', ')}`);
    failedCount++;
  }
  
  // 测试无效反馈验证
  const invalidFeedback = {
    feedbackType: 'invalid_type' as any,
    rating: 10,
    content: ''
  };
  
  const validation2 = feedbackCollector.validateFeedback(invalidFeedback);
  
  if (!validation2.valid && validation2.errors.length > 0) {
    console.log('✅ 无效反馈验证测试通过');
    console.log(`   检测到 ${validation2.errors.length} 个错误`);
    passedCount++;
  } else {
    console.log('❌ 无效反馈验证测试失败');
    failedCount++;
  }
  
  // 测试收集反馈
  try {
    const feedback = await feedbackCollector.collectFeedback({
      feedbackType: 'quality',
      rating: 5,
      content: '测试反馈：系统运行良好',
      specificIssues: ['测试问题1', '测试问题2'],
      userInfo: {
        grade: '高二',
        subject: '数学',
        deviceType: 'desktop'
      }
    });
    
    if (feedback.id && feedback.timestamp && feedback.content) {
      console.log('✅ 收集反馈测试通过');
      console.log(`   反馈ID: ${feedback.id}`);
      console.log(`   时间戳: ${new Date(feedback.timestamp).toLocaleString()}`);
      passedCount++;
    } else {
      console.log('❌ 收集反馈测试失败');
      failedCount++;
    }
    
    // 测试获取反馈摘要
    const summary = await feedbackCollector.getFeedbackSummary(5);
    
    if (summary.totalFeedbacks >= 1) {
      console.log('✅ 获取反馈摘要测试通过');
      console.log(`   总反馈数: ${summary.totalFeedbacks}`);
      console.log(`   平均评分: ${summary.averageRating}`);
      console.log(`   按类型统计: ${JSON.stringify(summary.feedbacksByType)}`);
      passedCount++;
    } else {
      console.log('❌ 获取反馈摘要测试失败');
      failedCount++;
    }
    
  } catch (error) {
    console.log('❌ 收集反馈测试异常:', error);
    failedCount += 2;
  }
  
} catch (error) {
  console.log('❌ 用户反馈收集器测试异常:', error);
  failedCount += 4;
}

  console.log('');

  // ============================================================================
  // 总结
  // ============================================================================
  console.log('='.repeat(60));
  console.log(`测试完成: ${passedCount + failedCount} 个测试`);
  console.log(`✅ 通过: ${passedCount}`);
  console.log(`❌ 失败: ${failedCount}`);
  console.log('='.repeat(60));

  if (failedCount === 0) {
    console.log('\n🎉 所有P0后端功能测试通过！');
    process.exit(0);
  } else {
    console.log('\n⚠️ 部分测试失败，请检查实现。');
    process.exit(1);
  }
}

// 运行测试
runTests().catch(error => {
  console.error('❌ 测试运行失败:', error);
  process.exit(1);
});
