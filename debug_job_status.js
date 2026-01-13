async function debugJobStatus() {
    const jobId = '019cae11-6466-43c0-a52a-cc8f098424c9';
    
    try {
        console.log('🔍 调试任务状态...');
        
        const response = await fetch(`http://localhost:3002/api/analyze-images/jobs/${jobId}?includeResult=1`);
        const result = await response.json();
        
        console.log('📋 完整响应:');
        console.log(JSON.stringify(result, null, 2));
        
        // 保存到文件
        const fs = require('fs');
        fs.writeFileSync('job_debug.json', JSON.stringify(result, null, 2));
        console.log('\n💾 调试信息已保存到 job_debug.json');
        
    } catch (error) {
        console.error('❌ 调试失败:', error.message);
    }
}

debugJobStatus();