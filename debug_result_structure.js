async function debugResultStructure() {
    const jobId = '142ad8fb-7c7f-414f-9bc9-d0e169204347';
    
    try {
        console.log('🔍 调试结果数据结构...\n');
        
        const response = await fetch(`http://localhost:3002/api/analyze-images/jobs/${jobId}?includeResult=1`);
        const result = await response.json();
        
        console.log('📋 完整响应结构:');
        console.log(JSON.stringify(result, null, 2));
        
        // 保存到文件
        const fs = require('fs');
        fs.writeFileSync('debug_result.json', JSON.stringify(result, null, 2));
        console.log('\n💾 完整结果已保存到 debug_result.json');
        
    } catch (error) {
        console.error('❌ 调试失败:', error.message);
    }
}

debugResultStructure();