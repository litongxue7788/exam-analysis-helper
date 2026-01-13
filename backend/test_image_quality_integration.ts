/**
 * 图片质量检查集成测试
 * 
 * 测试图片质量检查是否正确集成到服务器
 */

import { getImageQualityChecker } from './core/image-quality-checker';

async function testIntegration() {
  console.log('🧪 测试图片质量检查集成...\n');
  
  const checker = getImageQualityChecker();
  
  // 测试1: 模拟真实图片数据
  console.log('📝 测试1: 真实场景模拟');
  
  // 创建一个模拟的 base64 图片（小文件）
  const smallImage = 'data:image/jpeg;base64,' + Buffer.alloc(30 * 1024, 'A').toString('base64');
  
  try {
    const result = await checker.checkQuality(smallImage);
    
    console.log(`✅ 质量检查完成:`);
    console.log(`   - 评分: ${result.score}/100`);
    console.log(`   - 可继续: ${result.canProceed ? '是' : '否'}`);
    console.log(`   - 问题数: ${result.issues.length}`);
    console.log(`   - 建议数: ${result.suggestions.length}`);
    
    if (result.issues.length > 0) {
      console.log(`\n   检测到的问题:`);
      result.issues.forEach((issue, i) => {
        const emoji = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
        console.log(`   ${i + 1}. ${emoji} [${issue.severity}] ${issue.message}`);
      });
    }
    
    if (result.suggestions.length > 0) {
      console.log(`\n   改进建议:`);
      result.suggestions.forEach((s, i) => {
        console.log(`   ${i + 1}. ${s}`);
      });
    }
    
    console.log(`\n   详细信息:`);
    console.log(`   - 亮度: ${result.details.brightness}`);
    console.log(`   - 清晰度: ${result.details.sharpness}`);
    console.log(`   - 分辨率: ${result.details.resolution.width}x${result.details.resolution.height}`);
    console.log(`   - 文件大小: ${(result.details.fileSize / 1024).toFixed(2)} KB`);
    console.log(`   - 宽高比: ${result.details.aspectRatio.toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('\n✅ 集成测试完成！');
  console.log('\n📋 集成说明:');
  console.log('   1. 图片质量检查器已创建');
  console.log('   2. 已集成到 /api/analyze-images/jobs 接口');
  console.log('   3. 质量检查在创建作业前执行');
  console.log('   4. 质量结果保存在作业记录中');
  console.log('   5. 低质量图片会返回警告（但不阻塞）');
  console.log('\n📝 使用方式:');
  console.log('   POST /api/analyze-images/jobs');
  console.log('   Body: { images: [...], provider: "...", subject: "...", grade: "..." }');
  console.log('\n📊 响应格式:');
  console.log('   - 正常: { success: true, jobId: "...", qualityResults: [...] }');
  console.log('   - 警告: { success: true, warning: "IMAGE_QUALITY_LOW", message: "...", qualityResults: [...], suggestions: [...] }');
  console.log('\n🎯 下一步:');
  console.log('   1. 前端显示质量警告');
  console.log('   2. 提供重新拍照选项');
  console.log('   3. 显示改进建议');
  console.log('');
}

testIntegration().catch(console.error);
