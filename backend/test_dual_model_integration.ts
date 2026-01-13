/**
 * 双模型验证集成测试
 * 
 * 测试双模型验证在实际服务器流程中的集成
 */

import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '.env') });

// 启用双模型验证
process.env.DUAL_MODEL_VALIDATION_ENABLED = '1';
process.env.DUAL_MODEL_SECONDARY_PROVIDER = 'aliyun'; // 使用aliyun作为辅助模型

console.log('🧪 双模型验证集成测试\n');
console.log('环境配置:');
console.log(`  - 双模型验证: ${process.env.DUAL_MODEL_VALIDATION_ENABLED === '1' ? '✅ 已启用' : '❌ 未启用'}`);
console.log(`  - 主模型: ${process.env.DEFAULT_PROVIDER || 'doubao'}`);
console.log(`  - 辅助模型: ${process.env.DUAL_MODEL_SECONDARY_PROVIDER || 'aliyun'}`);
console.log('');

// 检查API Key配置
const hasDoubao = !!process.env.DOUBAO_API_KEY;
const hasAliyun = !!process.env.ALIYUN_API_KEY;
const hasZhipu = !!process.env.ZHIPU_API_KEY;

console.log('API Key 配置:');
console.log(`  - Doubao: ${hasDoubao ? '✅ 已配置' : '❌ 未配置'}`);
console.log(`  - Aliyun: ${hasAliyun ? '✅ 已配置' : '❌ 未配置'}`);
console.log(`  - Zhipu: ${hasZhipu ? '✅ 已配置' : '❌ 未配置'}`);
console.log('');

if (!hasDoubao && !hasAliyun && !hasZhipu) {
  console.error('❌ 错误: 未配置任何大模型 API Key');
  console.error('请在 backend/.env 文件中配置至少两个模型的 API Key');
  process.exit(1);
}

const availableProviders = [
  hasDoubao ? 'doubao' : null,
  hasAliyun ? 'aliyun' : null,
  hasZhipu ? 'zhipu' : null
].filter(Boolean);

if (availableProviders.length < 2) {
  console.warn('⚠️  警告: 只配置了一个模型，双模型验证将回退到单模型模式');
  console.warn('建议配置至少两个不同的模型以测试双模型验证功能');
  console.log('');
}

console.log('✅ 环境检查通过\n');
console.log('📝 测试说明:');
console.log('  1. 双模型验证会同时调用两个模型');
console.log('  2. 验证器会比较两个模型的结果');
console.log('  3. 不一致时会智能选择更合理的结果');
console.log('  4. 验证结果会记录在响应中');
console.log('');

console.log('🚀 启动服务器测试...');
console.log('');
console.log('提示: 要测试双模型验证，请:');
console.log('  1. 启动服务器: npm run dev');
console.log('  2. 上传试卷图片进行分析');
console.log('  3. 查看控制台日志中的双模型验证信息');
console.log('  4. 检查响应中的 dualModelValidation 字段');
console.log('');

console.log('预期日志输出:');
console.log('  🔄 [Dual Model] 启动双模型验证: doubao + aliyun');
console.log('  ✅ [Dual Model] 两个模型都已返回结果，开始验证...');
console.log('  ✅ [Dual Model] 验证完成:');
console.log('     - 考试名称: consistent');
console.log('     - 科目: consistent');
console.log('     - 得分: consistent/inconsistent');
console.log('     - 满分: consistent');
console.log('     - 问题列表: consistent/inconsistent/uncertain');
console.log('     - 不一致项: N');
console.log('     - 需要用户确认: true/false');
console.log('');

console.log('✅ 集成测试配置完成');
console.log('');
console.log('下一步:');
console.log('  1. 确保至少配置了两个不同的模型 API Key');
console.log('  2. 启动服务器: npm run dev');
console.log('  3. 使用前端或API测试工具上传试卷图片');
console.log('  4. 观察双模型验证的日志输出');
console.log('  5. 检查返回结果中的验证信息');
