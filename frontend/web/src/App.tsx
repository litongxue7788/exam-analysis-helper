import { useState, useEffect } from 'react'
import { Home } from './pages/Home'
import { Report } from './pages/Report'
import { PracticeSheet } from './pages/PracticeSheet'
import { PrintLayout } from './components/PrintLayout'
import { MOCK_DATA } from './data/mock'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState<'analyze' | 'report' | 'practice'>('analyze');

  const [examHistory, setExamHistory] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('examHistory');
      return saved ? JSON.parse(saved) : [MOCK_DATA];
    } catch (e) {
      console.error('Failed to load history', e);
      return [MOCK_DATA];
    }
  });

  const [currentExamIndex, setCurrentExamIndex] = useState<number>(0);

  const currentExam = examHistory[currentExamIndex] || null;

  useEffect(() => {
    localStorage.setItem('examHistory', JSON.stringify(examHistory));
  }, [examHistory]);

  const handleAnalyzeComplete = (result: any) => {
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
    
    setCurrentExamIndex(0);
    setActiveTab('report');
  };

  const handleSwitchExam = (index: number) => {
    setCurrentExamIndex(index);
    setActiveTab('analyze');
  };

  return (
    <div className="app-container">
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
            onOpenPractice={() => setActiveTab('practice')}
          />
        )}

        {activeTab === 'practice' && (
          <PracticeSheet
            data={currentExam}
            onBack={() => setActiveTab('report')}
          />
        )}
      </div>

      {/* 打印专用布局 (默认隐藏，仅在打印时显示) */}
      <PrintLayout data={currentExam} />
    </div>
  )
}

export default App
