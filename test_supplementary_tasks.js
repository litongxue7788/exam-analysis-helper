const fs = require('fs');

async function testSupplementaryTasks() {
    console.log('🧪 开始测试补充任务功能...\n');

    const imageFiles = [
        'test_image_1.jpg',
        'test_image_2.jpg', 
        'test_image_3.jpg',
        'test_image_4.jpg'
    ];
    
    // 检查图片文件是否存在
    for (const file of imageFiles) {
        if (!fs.existsSync(file)) {
            console.error(`❌ 图片文件不存在: ${file}`);
            return;
        }
    }
    
    // 将图片转换为base64
    const images = [];
    for (const file of imageFiles) {
        const buffer = fs.readFileSync(file);
        const base64 = buffer.toString('base64');
        images.push(`data:image/jpeg;base64,${base64}`);
    }
    
    // 准备请求数据
    const requestData = {
        images: images,
        provider: 'doubao',
        subject: '数学',
        grade: '高二'
    };
    
    try {
        console.log('📤 创建分析任务...');
        
        const response = await fetch('http://localhost:3002/api/analyze-images/jobs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ 请求失败: ${response.status} ${response.statusText}`);
            console.error('错误详情:', errorText);
            return;
        }
        
        const result = await response.json();
        
        if (!result.success) {
            console.error('❌ 分析失败:', result.errorMessage);
            return;
        }
        
        console.log('✅ 分析任务已创建！');
        console.log(`📋 任务ID: ${result.jobId}`);
        
        const jobId = result.jobId;
        let attempts = 0;
        const maxAttempts = 60;
        
        console.log('⏳ 监控分析进度和补充任务功能...\n');
        
        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            attempts++;
            
            try {
                const statusResponse = await fetch(`http://localhost:3002/api/analyze-images/jobs/${jobId}?includeResult=1`);
                const statusResult = await statusResponse.json();
                
                if (!statusResult.success) {
                    console.error('❌ 获取状态失败:', statusResult.errorMessage);
                    break;
                }
                
                const job = statusResult.job;
                
                // 测试智能时长估算
                if (job.estimateSeconds) {
                    console.log(`⏱️ [智能时长估算] 预计: ${job.estimateSeconds}秒`);
                }
                
                // 测试渐进式加载
                console.log(`🔄 [渐进式加载] 状态: ${job.status} | 阶段: ${job.stage}`);
                
                if (job.status === 'completed') {
                    console.log('\n🎉 分析完成！开始验证补充任务功能...\n');
                    
                    if (job.result) {
                        // 测试证据来源追溯
                        console.log('📍 [证据来源追溯] 验证:');
                        if (job.result.evidenceSourceTracking) {
                            const tracking = job.result.evidenceSourceTracking;
                            console.log(`  ✅ 追溯已启用: ${tracking.trackingEnabled}`);
                            console.log(`  ✅ 总图片数: ${tracking.totalImages}`);
                            console.log(`  ✅ 分析方法: ${tracking.analysisMethod}`);
                            console.log(`  ✅ 证据来源数: ${tracking.sources.length}`);
                            
                            // 显示前3个证据来源
                            tracking.sources.slice(0, 3).forEach((source, index) => {
                                console.log(`    证据${index + 1}: 图片${source.imageIndex !== undefined ? source.imageIndex + 1 : '未知'}, 置信度: ${source.confidence}`);
                            });
                        } else {
                            console.log('  ❌ 证据来源追溯数据缺失');
                        }
                        
                        // 测试低置信度提示
                        console.log('\n⚠️ [低置信度提示] 验证:');
                        if (job.result.recognitionInfo) {
                            const recognition = job.result.recognitionInfo;
                            console.log(`  ✅ 识别结果: ${recognition.grade} ${recognition.subject}`);
                            console.log(`  ✅ 置信度: ${(recognition.confidence.score * 100).toFixed(0)}% (${recognition.confidence.level})`);
                            
                            if (recognition.warnings && recognition.warnings.length > 0) {
                                console.log(`  ✅ 警告信息: ${recognition.warnings.join(', ')}`);
                            }
                        } else {
                            console.log('  ❌ 识别信息缺失');
                        }
                        
                        // 测试用户反馈功能（检查接口是否存在）
                        console.log('\n💬 [用户反馈] 验证:');
                        try {
                            const feedbackResponse = await fetch(`http://localhost:3002/api/feedback`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    type: 'accuracy',
                                    rating: 5,
                                    comment: '测试反馈',
                                    jobId: jobId
                                })
                            });
                            
                            if (feedbackResponse.ok) {
                                console.log('  ✅ 反馈接口正常工作');
                            } else {
                                console.log('  ⚠️ 反馈接口响应异常');
                            }
                        } catch (error) {
                            console.log('  ⚠️ 反馈接口测试失败:', error.message);
                        }
                        
                        // 测试质量评估
                        console.log('\n🔍 [质量评估] 验证:');
                        if (job.result.qualityMetrics) {
                            const quality = job.result.qualityMetrics;
                            console.log(`  ✅ 整体质量: ${quality.overallScore}/100`);
                            console.log(`  ✅ 识别置信度: ${(quality.recognitionConfidence * 100).toFixed(0)}%`);
                            console.log(`  ✅ 分析置信度: ${(quality.analysisConfidence * 100).toFixed(0)}%`);
                            console.log(`  ✅ 证据完整性: ${(quality.evidenceCompleteness * 100).toFixed(0)}%`);
                        } else {
                            console.log('  ❌ 质量评估数据缺失');
                        }
                    }
                    
                    break;
                } else if (job.status === 'failed') {
                    console.error('❌ 分析失败:', job.errorMessage);
                    break;
                }
                
            } catch (error) {
                console.error('❌ 获取状态时出错:', error.message);
                break;
            }
        }
        
        if (attempts >= maxAttempts) {
            console.log('⏰ 等待超时');
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }
    
    console.log('\n✅ 补充任务功能测试完成！');
}

// 运行测试
testSupplementaryTasks();