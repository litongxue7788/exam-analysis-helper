const fs = require('fs');
const path = require('path');

async function testImageAnalysis() {
    console.log('🚀 开始测试图片分析...');
    
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
        console.log(`✅ 找到图片: ${file}`);
    }
    
    // 将图片转换为base64
    const images = [];
    for (const file of imageFiles) {
        const buffer = fs.readFileSync(file);
        const base64 = buffer.toString('base64');
        images.push(`data:image/jpeg;base64,${base64}`);
        console.log(`📸 已转换图片: ${file} (${Math.round(buffer.length / 1024)}KB)`);
    }
    
    // 准备请求数据
    const requestData = {
        images: images,
        provider: 'doubao',  // 使用豆包模型
        subject: '数学',     // 可选，让系统自动识别
        grade: '高二'        // 可选，让系统自动识别
    };
    
    try {
        console.log('📤 发送分析请求到后端...');
        
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
        
        // 轮询任务状态
        const jobId = result.jobId;
        console.log('⏳ 等待分析完成...');
        
        let attempts = 0;
        const maxAttempts = 60; // 最多等待5分钟
        
        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // 等待5秒
            attempts++;
            
            try {
                const statusResponse = await fetch(`http://localhost:3002/api/analyze-images/jobs/${jobId}?includeResult=1`);
                const statusResult = await statusResponse.json();
                
                if (!statusResult.success) {
                    console.error('❌ 获取状态失败:', statusResult.errorMessage);
                    break;
                }
                
                const job = statusResult.job;
                console.log(`📊 状态: ${job.status} | 阶段: ${job.stage} | 进度: ${job.progress}%`);
                
                if (job.status === 'completed') {
                    console.log('🎉 分析完成！');
                    
                    if (job.result) {
                        console.log('\n📋 分析结果:');
                        
                        // 检查试卷信息
                        if (job.result.examInfo) {
                            console.log(`学科: ${job.result.examInfo.subject}`);
                            console.log(`年级: ${job.result.examInfo.grade}`);
                            console.log(`置信度: ${job.result.examInfo.confidence}%`);
                            
                            // 检查是否有低置信度警告
                            if (job.result.examInfo.confidence < 70) {
                                console.log('⚠️ 检测到低置信度，应该触发确认对话框');
                            }
                        }
                        
                        // 检查题目分析
                        if (job.result.analysis && job.result.analysis.length > 0) {
                            console.log('\n📝 题目分析:');
                            job.result.analysis.slice(0, 3).forEach((item, index) => {
                                console.log(`题目 ${index + 1}: ${item.questionNumber} - ${item.score} - ${item.evidence}`);
                            });
                            if (job.result.analysis.length > 3) {
                                console.log(`... 还有 ${job.result.analysis.length - 3} 个题目`);
                            }
                        }
                        
                        // 检查低置信度警告
                        if (job.result.lowConfidenceWarning && job.result.lowConfidenceWarning.hasWarning) {
                            console.log('\n⚠️ 低置信度警告:');
                            console.log(`级别: ${job.result.lowConfidenceWarning.level}`);
                            console.log(`消息: ${job.result.lowConfidenceWarning.message}`);
                        }
                    }
                    
                    break;
                } else if (job.status === 'failed') {
                    console.error('❌ 分析失败:', job.error);
                    break;
                } else if (job.status === 'paused') {
                    console.log('⏸️ 分析已暂停，等待用户确认');
                    
                    // 检查暂停原因
                    if (job.pauseReason) {
                        console.log(`暂停原因: ${job.pauseReason}`);
                    }
                    
                    // 如果是低置信度暂停，这里可以测试确认功能
                    if (job.pauseReason && job.pauseReason.includes('置信度较低')) {
                        console.log('🔧 这里应该显示低置信度确认对话框');
                        console.log('📝 用户可以选择：继续分析、修正后继续、或取消');
                        
                        // 为了测试，我们选择继续分析
                        console.log('🚀 自动选择继续分析...');
                        const confirmResponse = await fetch(`http://localhost:3002/api/analyze-images/jobs/${jobId}/confirm`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                action: 'continue'
                            })
                        });
                        
                        const confirmResult = await confirmResponse.json();
                        if (confirmResult.success) {
                            console.log('✅ 已确认继续分析');
                        } else {
                            console.error('❌ 确认失败:', confirmResult.errorMessage);
                        }
                    }
                }
                
            } catch (error) {
                console.error('❌ 获取状态时出错:', error.message);
                break;
            }
        }
        
        if (attempts >= maxAttempts) {
            console.log('⏰ 等待超时，请手动检查任务状态');
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }
}

// 运行测试
testImageAnalysis();