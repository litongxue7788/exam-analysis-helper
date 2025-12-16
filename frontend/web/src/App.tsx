import { useState, useEffect } from 'react'
import { Home } from './pages/Home'
import { Report } from './pages/Report'
import { PrintLayout } from './components/PrintLayout'
import { MOCK_DATA } from './data/mock'
import './App.css'

function App() {
  // 当前激活的 Tab：'analyze' 或 'report'
  const [activeTab, setActiveTab] = useState<'analyze' | 'report'>('analyze');

  // 考试历史记录 (从 localStorage 读取)
  const [examHistory, setExamHistory] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('examHistory');
      return saved ? JSON.parse(saved) : [MOCK_DATA];
    } catch (e) {
      console.error('Failed to load history', e);
      return [MOCK_DATA];
    }
  });

  // 当前选中的考试索引
  const [currentExamIndex, setCurrentExamIndex] = useState<number>(0);

  // 获取当前考试数据
  const currentExam = examHistory[currentExamIndex] || null;

  // 持久化历史记录
  useEffect(() => {
    localStorage.setItem('examHistory', JSON.stringify(examHistory));
  }, [examHistory]);

  // 分析完成的回调：添加/更新记录并切到报告页
  const handleAnalyzeComplete = (result: any) => {
    // 构造新的考试记录
    // 如果当前是在“新建”模式下（比如 currentExamIndex 指向一个空模板），则更新它
    // 但简单起见，我们总是追加新的分析结果作为最新的一条，并选中它
    // 或者：检查 result 是否包含 ID，如果有则更新，没有则新增
    
    const newExam = {
      ...result,
      id: result.id || Date.now().toString(), // 确保有 ID
      timestamp: new Date().toISOString()
    };

    setExamHistory(prev => {
      // 如果是同一个考试（根据某种标识，比如 id 或 姓名+考试名），则更新
      // 这里简单做：总是添加到头部
      const newHistory = [newExam, ...prev];
      return newHistory;
    });
    
    setCurrentExamIndex(0); // 选中最新的
    setActiveTab('report');
  };

  // 切换考试
  const handleSwitchExam = (index: number) => {
    setCurrentExamIndex(index);
    setActiveTab('analyze'); // 切换回概览页查看该考试
  };

  return (
    <div className="app-container">
      {/* 页面内容区域 (根据 Tab 切换) */}
      <div className="page-wrapper">
        {activeTab === 'analyze' && (
          <Home 
            onAnalyzeComplete={handleAnalyzeComplete} 
            initialData={currentExam}
            history={examHistory}
            onSwitchExam={handleSwitchExam}
          />
        )}

        {activeTab === 'report' && (
          <Report 
            data={currentExam} 
            onBack={() => setActiveTab('analyze')} 
          />
        )}
      </div>

      {/* 打印专用布局 (默认隐藏，仅在打印时显示) */}
      <PrintLayout data={currentExam} />
    </div>
  )
}

export default App
