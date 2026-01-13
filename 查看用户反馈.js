#!/usr/bin/env node
// =================================================================================
// 查看用户反馈脚本
// 用法: node 查看用户反馈.js [选项]
// 选项: --all (显示所有), --last N (显示最近N条), --export (导出CSV)
// =================================================================================

const fs = require('fs');
const path = require('path');

// 配置
const FEEDBACK_FILE = path.join(__dirname, 'backend', 'data', 'feedbacks', 'user-feedbacks.jsonl');
const CSV_FILE = path.join(__dirname, 'backend', 'data', 'feedbacks', 'feedbacks.csv');

// 解析命令行参数
const args = process.argv.slice(2);
const showAll = args.includes('--all');
const exportCsv = args.includes('--export');
const lastIndex = args.indexOf('--last');
const lastN = lastIndex >= 0 && args[lastIndex + 1] ? parseInt(args[lastIndex + 1]) : 10;

// 类型映射
const TYPE_MAP = {
  'accuracy': '准确性',
  'quality': '质量',
  'suggestion': '建议',
  'bug': '错误',
  'other': '其他'
};

// 读取反馈数据
function readFeedbacks() {
  if (!fs.existsSync(FEEDBACK_FILE)) {
    console.log('❌ 还没有收到任何反馈');
    console.log(`   文件不存在: ${FEEDBACK_FILE}`);
    return [];
  }

  const content = fs.readFileSync(FEEDBACK_FILE, 'utf-8');
  const lines = content.trim().split('\n').filter(line => line.trim());
  
  return lines.map(line => {
    try {
      return JSON.parse(line);
    } catch (e) {
      console.error(`⚠️  解析失败: ${line.substring(0, 50)}...`);
      return null;
    }
  }).filter(Boolean);
}

// 格式化时间
function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// 显示反馈
function displayFeedbacks(feedbacks) {
  if (feedbacks.length === 0) {
    console.log('❌ 没有反馈数据');
    return;
  }

  console.log('\n' + '='.repeat(80));
  console.log(`📊 用户反馈列表 (共 ${feedbacks.length} 条)`);
  console.log('='.repeat(80) + '\n');

  feedbacks.forEach((feedback, index) => {
    console.log(`\n【反馈 #${index + 1}】`);
    console.log(`ID:       ${feedback.id}`);
    console.log(`时间:     ${formatDate(feedback.timestamp)}`);
    console.log(`类型:     ${TYPE_MAP[feedback.feedbackType] || feedback.feedbackType}`);
    
    if (feedback.rating) {
      console.log(`评分:     ${'⭐'.repeat(feedback.rating)} (${feedback.rating}/5)`);
    }
    
    if (feedback.content) {
      console.log(`内容:     ${feedback.content}`);
    }
    
    if (feedback.specificIssues && feedback.specificIssues.length > 0) {
      console.log(`具体问题: ${feedback.specificIssues.join(', ')}`);
    }
    
    if (feedback.userInfo) {
      const info = [];
      if (feedback.userInfo.grade) info.push(`年级: ${feedback.userInfo.grade}`);
      if (feedback.userInfo.subject) info.push(`学科: ${feedback.userInfo.subject}`);
      if (feedback.userInfo.deviceType) info.push(`设备: ${feedback.userInfo.deviceType}`);
      if (info.length > 0) {
        console.log(`用户信息: ${info.join(', ')}`);
      }
    }
    
    console.log('-'.repeat(80));
  });
}

// 显示统计信息
function displayStatistics(feedbacks) {
  if (feedbacks.length === 0) return;

  console.log('\n' + '='.repeat(80));
  console.log('📈 统计信息');
  console.log('='.repeat(80) + '\n');

  // 总数
  console.log(`总反馈数: ${feedbacks.length}`);

  // 平均评分
  const ratings = feedbacks.filter(f => f.rating).map(f => f.rating);
  if (ratings.length > 0) {
    const avgRating = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
    console.log(`平均评分: ${avgRating}/5.0 (${ratings.length}条有评分)`);
  }

  // 按类型分布
  const byType = {};
  feedbacks.forEach(f => {
    const type = TYPE_MAP[f.feedbackType] || f.feedbackType;
    byType[type] = (byType[type] || 0) + 1;
  });
  
  console.log('\n按类型分布:');
  Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      const percentage = ((count / feedbacks.length) * 100).toFixed(1);
      const bar = '█'.repeat(Math.ceil(count / feedbacks.length * 20));
      console.log(`  ${type.padEnd(8)} ${bar} ${count} (${percentage}%)`);
    });

  // 按年级分布
  const byGrade = {};
  feedbacks.forEach(f => {
    if (f.userInfo && f.userInfo.grade) {
      byGrade[f.userInfo.grade] = (byGrade[f.userInfo.grade] || 0) + 1;
    }
  });
  
  if (Object.keys(byGrade).length > 0) {
    console.log('\n按年级分布:');
    Object.entries(byGrade)
      .sort((a, b) => b[1] - a[1])
      .forEach(([grade, count]) => {
        console.log(`  ${grade}: ${count}`);
      });
  }

  // 按学科分布
  const bySubject = {};
  feedbacks.forEach(f => {
    if (f.userInfo && f.userInfo.subject) {
      bySubject[f.userInfo.subject] = (bySubject[f.userInfo.subject] || 0) + 1;
    }
  });
  
  if (Object.keys(bySubject).length > 0) {
    console.log('\n按学科分布:');
    Object.entries(bySubject)
      .sort((a, b) => b[1] - a[1])
      .forEach(([subject, count]) => {
        console.log(`  ${subject}: ${count}`);
      });
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

// 导出为CSV
function exportToCsv(feedbacks) {
  if (feedbacks.length === 0) {
    console.log('❌ 没有数据可导出');
    return;
  }

  // CSV表头
  const csv = ['ID,时间,类型,评分,内容,具体问题,年级,学科,设备'];

  // CSV数据行
  feedbacks.forEach(f => {
    const row = [
      f.id,
      formatDate(f.timestamp),
      TYPE_MAP[f.feedbackType] || f.feedbackType,
      f.rating || '',
      `"${(f.content || '').replace(/"/g, '""')}"`,
      `"${(f.specificIssues || []).join(', ')}"`,
      f.userInfo?.grade || '',
      f.userInfo?.subject || '',
      f.userInfo?.deviceType || ''
    ].join(',');
    csv.push(row);
  });

  // 写入文件（添加BOM以支持Excel正确显示中文）
  const csvContent = '\uFEFF' + csv.join('\n');
  fs.writeFileSync(CSV_FILE, csvContent, 'utf-8');
  
  console.log(`\n✅ 导出成功: ${CSV_FILE}`);
  console.log(`   共导出 ${feedbacks.length} 条反馈`);
  console.log(`   可以用Excel打开查看\n`);
}

// 主函数
function main() {
  console.log('\n🔍 正在读取用户反馈...\n');

  const allFeedbacks = readFeedbacks();
  
  if (allFeedbacks.length === 0) {
    return;
  }

  // 根据参数决定显示哪些反馈
  let feedbacksToShow = allFeedbacks;
  if (!showAll) {
    feedbacksToShow = allFeedbacks.slice(-lastN);
  }

  // 显示反馈
  displayFeedbacks(feedbacksToShow);

  // 显示统计信息
  displayStatistics(allFeedbacks);

  // 导出CSV
  if (exportCsv) {
    exportToCsv(allFeedbacks);
  }

  // 提示
  if (!showAll && allFeedbacks.length > lastN) {
    console.log(`💡 提示: 只显示了最近 ${lastN} 条反馈，使用 --all 查看全部 ${allFeedbacks.length} 条`);
  }
  
  console.log('💡 提示: 使用 --export 导出为CSV文件\n');
}

// 运行
main();
