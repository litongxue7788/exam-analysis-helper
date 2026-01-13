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
    
    // 创建FormData
    const formData = new FormData();
    
    // 添加图片文件
    for (const file of imageFiles) {
        const fileBuffer = fs.readFileSync(file);
        const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
        formData.append('images', blob, file);
    }
    
    try {
        console.log('📤 发送分析请求到后端...');
        
        const response = await fetch('http://localhost:3002/api/analyze-exam', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ 请求失败: ${response.status} ${response.statusText}`);
            console.error('错误详情:', errorText);
            return;
        }
        
        const result = await response.json();
        
        console.log('✅ 分析完成！');
        console.log('📊 分析结果:');
        console.log(JSON.stringify(result, null, 2));
        
        // 检查关键信息
        if (result.examInfo) {
            console.log('\n📋 试卷信息:');
            console.log(`学科: ${result.examInfo.subject}`);
            console.log(`年级: ${result.examInfo.grade}`);
            console.log(`置信度: ${result.examInfo.confidence}%`);
        }
        
        if (result.analysis && result.analysis.length > 0) {
            console.log('\n📝 题目分析:');
            result.analysis.forEach((item, index) => {
                console.log(`题目 ${index + 1}: ${item.questionNumber} - ${item.score} - ${item.evidence}`);
            });
        }
        
        // 检查是否有低置信度警告
        if (result.examInfo && result.examInfo.confidence < 70) {
            console.log('\n⚠️ 检测到低置信度，应该触发确认对话框');
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }
}

// 运行测试
testImageAnalysis();