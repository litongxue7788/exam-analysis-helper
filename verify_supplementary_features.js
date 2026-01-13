async function verifySupplementaryFeatures() {
    const jobId = '142ad8fb-7c7f-414f-9bc9-d0e169204347';
    
    try {
        console.log('🔍 验证补充任务功能...\n');
        
        const response = await fetch(`http://localhost:3002/api/analyze-images/jobs/${jobId}?includeResult=1`);
        const result = await response.json();
        
        if (!result.success) {
            console.error('❌ 获取结果失败:', result.errorMessage);
            return;
        }
        
        const job = result.job;
        console.log(`📋 任务状态: ${job.status}`);
        console.log(`⏱️ 智能时长估算: ${job.estimateSeconds}秒\n`);
        
        if (job.result && job.result.data) {
            const data = job.result.data;
            
            // 1. 验证证据来源追溯
            console.log('📍 [证据来源追溯] 验证:');
            if (data.evidenceSourceTracking) {
                const tracking = data.evidenceSourceTracking;
                console.log(`  ✅ 追溯已启用: ${tracking.trackingEnabled}`);
                console.log(`  ✅ 总图片数: ${tracking.totalImages}`);
                console.log(`  ✅ 分析方法: ${tracking.analysisMethod}`);
                console.log(`  ✅ 证据来源数: ${tracking.sources.length}`);
                
                if (tracking.sources.length > 0) {
                    console.log('  证据来源详情:');
                    tracking.sources.slice(0, 3).forEach((source, index) => {
                        console.log(`    ${index + 1}. 问题索引: ${source.problemIndex}, 图片: ${source.imageIndex !== undefined ? source.imageIndex + 1 : '批量'}, 置信度: ${source.confidence}`);
                    });
                }
            } else {
                console.log('  ❌ 证据来源追溯数据缺失');
            }
            
            // 2. 验证识别信息和低置信度提示
            console.log('\n⚠️ [识别信息和低置信度提示] 验证:');
            if (data.recognition) {
                const recognition = data.recognition;
                console.log(`  ✅ 识别结果: ${recognition.grade} ${recognition.subject}`);
                console.log(`  ✅ 年级置信度: ${(recognition.gradeConfidence * 100).toFixed(0)}%`);
                console.log(`  ✅ 学科置信度: ${(recognition.subjectConfidence * 100).toFixed(0)}%`);
                console.log(`  ✅ 综合置信度: ${(recognition.overallConfidence * 100).toFixed(0)}% (${recognition.confidenceLevel})`);
                console.log(`  ✅ 需要确认: ${recognition.needsConfirmation ? '是' : '否'}`);
            } else {
                console.log('  ❌ 识别信息缺失');
            }
            
            // 3. 验证低置信度警告
            if (data.lowConfidenceWarning) {
                const warning = data.lowConfidenceWarning;
                console.log(`  ✅ 低置信度警告: ${warning.hasWarning ? '是' : '否'}`);
                if (warning.hasWarning) {
                    console.log(`    级别: ${warning.level}`);
                    console.log(`    消息: ${warning.message}`);
                    console.log(`    建议: ${warning.suggestions.join(', ')}`);
                }
            }
            
            // 4. 验证质量评估
            console.log('\n🔍 [质量评估] 验证:');
            if (result.qualityMetrics) {
                const quality = result.qualityMetrics;
                console.log(`  ✅ 整体质量: ${quality.overallScore}/100`);
                console.log(`  ✅ 识别置信度: ${(quality.recognitionConfidence * 100).toFixed(0)}%`);
                console.log(`  ✅ 分析置信度: ${(quality.analysisConfidence * 100).toFixed(0)}%`);
                console.log(`  ✅ 证据完整性: ${(quality.evidenceCompleteness * 100).toFixed(0)}%`);
                console.log(`  ✅ 内容可读性: ${(quality.contentReadability * 100).toFixed(0)}%`);
            } else {
                console.log('  ❌ 质量评估数据缺失');
            }
            
            // 5. 验证分析报告结构
            console.log('\n📊 [分析报告] 验证:');
            if (data.report && data.report.forStudent && data.report.forStudent.problems) {
                const problems = data.report.forStudent.problems;
                console.log(`  ✅ 错因分析数量: ${problems.length}`);
                
                // 检查前3个问题的证据完整性
                problems.slice(0, 3).forEach((problem, index) => {
                    const hasQuestionNo = problem.includes('【题号】');
                    const hasScore = problem.includes('【得分】');
                    const hasEvidence = problem.includes('【证据】');
                    const hasConfidence = problem.includes('【置信度】');
                    
                    console.log(`    问题${index + 1}: 题号${hasQuestionNo ? '✅' : '❌'} 得分${hasScore ? '✅' : '❌'} 证据${hasEvidence ? '✅' : '❌'} 置信度${hasConfidence ? '✅' : '❌'}`);
                });
            } else {
                console.log('  ❌ 分析报告数据缺失');
            }
            
            // 6. 测试用户反馈接口
            console.log('\n💬 [用户反馈接口] 测试:');
            try {
                const feedbackResponse = await fetch(`http://localhost:3002/api/feedback`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        type: 'accuracy',
                        rating: 5,
                        comment: '补充任务测试反馈',
                        jobId: jobId
                    })
                });
                
                if (feedbackResponse.ok) {
                    const feedbackResult = await feedbackResponse.json();
                    console.log('  ✅ 反馈接口正常工作');
                    console.log(`    响应: ${JSON.stringify(feedbackResult)}`);
                } else {
                    console.log(`  ⚠️ 反馈接口响应异常: ${feedbackResponse.status}`);
                }
            } catch (error) {
                console.log('  ⚠️ 反馈接口测试失败:', error.message);
            }
            
        } else {
            console.log('❌ 分析结果数据缺失');
        }
        
    } catch (error) {
        console.error('❌ 验证失败:', error.message);
    }
    
    console.log('\n🎉 补充任务功能验证完成！');
}

verifySupplementaryFeatures();