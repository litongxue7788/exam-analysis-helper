async function getAnalysisResult() {
    const jobId = '019cae11-6466-43c0-a52a-cc8f098424c9'; // 从上面的输出获取
    
    try {
        console.log('📋 获取完整分析结果...');
        
        const response = await fetch(`http://localhost:3002/api/analyze-images/jobs/${jobId}?includeResult=1`);
        const result = await response.json();
        
        if (!result.success) {
            console.error('❌ 获取结果失败:', result.errorMessage);
            return;
        }
        
        const job = result.job;
        console.log(`✅ 任务状态: ${job.status}`);
        
        if (job.result) {
            console.log('\n📊 分析结果详情:');
            
            // 试卷信息
            if (job.result.examInfo) {
                console.log('\n📋 试卷信息:');
                console.log(`  学科: ${job.result.examInfo.subject}`);
                console.log(`  年级: ${job.result.examInfo.grade}`);
                console.log(`  置信度: ${job.result.examInfo.confidence}%`);
                console.log(`  置信度级别: ${job.result.examInfo.confidenceLevel}`);
                console.log(`  需要确认: ${job.result.examInfo.needsConfirmation ? '是' : '否'}`);
            }
            
            // 低置信度警告
            if (job.result.lowConfidenceWarning) {
                console.log('\n⚠️ 低置信度警告:');
                console.log(`  有警告: ${job.result.lowConfidenceWarning.hasWarning}`);
                console.log(`  级别: ${job.result.lowConfidenceWarning.level}`);
                console.log(`  消息: ${job.result.lowConfidenceWarning.message}`);
                if (job.result.lowConfidenceWarning.suggestions) {
                    console.log(`  建议: ${job.result.lowConfidenceWarning.suggestions.join(', ')}`);
                }
            }
            
            // 题目分析
            if (job.result.analysis && job.result.analysis.length > 0) {
                console.log('\n📝 题目分析:');
                job.result.analysis.forEach((item, index) => {
                    console.log(`  题目 ${index + 1}:`);
                    console.log(`    题号: ${item.questionNumber}`);
                    console.log(`    得分: ${item.score}`);
                    console.log(`    证据: ${item.evidence}`);
                    if (item.confidence) {
                        console.log(`    置信度: ${item.confidence}`);
                    }
                });
            }
            
            // 质量评估
            if (job.result.qualityAssurance) {
                console.log('\n🔍 质量评估:');
                console.log(`  总分: ${job.result.qualityAssurance.overallScore}/100`);
                if (job.result.qualityAssurance.suggestions) {
                    console.log(`  建议: ${job.result.qualityAssurance.suggestions.join('; ')}`);
                }
            }
            
            // 保存完整结果到文件
            const fs = require('fs');
            fs.writeFileSync('analysis_result.json', JSON.stringify(job.result, null, 2));
            console.log('\n💾 完整结果已保存到 analysis_result.json');
            
        } else {
            console.log('❌ 没有分析结果');
        }
        
    } catch (error) {
        console.error('❌ 获取结果失败:', error.message);
    }
}

getAnalysisResult();