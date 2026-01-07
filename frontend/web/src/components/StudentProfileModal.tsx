
import React, { useState, useMemo } from 'react';
import { Download } from 'lucide-react';
import { aggregateKnowledgePoints } from '../utils/analytics';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: any[];
  onSwitchExam?: (index: number) => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({ isOpen, onClose, history, onSwitchExam }) => {
  const [activeTab, setActiveTab] = useState<'trends' | 'knowledge'>('trends');

  const knowledgeStats = useMemo(() => aggregateKnowledgePoints(history), [history]);

  // Re-use trend calculation logic or pass it in? 
  // Let's implement a simpler version here or rely on the parent to pass trendData if we want to be pure.
  // But for V4 componentization, self-contained is nice.
  
  const trendData = useMemo(() => {
    const sortedHistory = [...history].sort((a, b) => {
      const t1 = new Date(a.timestamp || 0).getTime();
      const t2 = new Date(b.timestamp || 0).getTime();
      return t1 - t2;
    });
    const limitedExams = sortedHistory.slice(-5);
    const scores = limitedExams.map(e => e.summary?.totalScore ?? e.score ?? 0);
    const labels = limitedExams.map(e => (e.studentInfo?.examName || '未命名').replace('2024', '').replace('2025', ''));
    
    // SVG Logic
    const maxScore = Math.max(...scores, 100);
    const chartHeight = 150;
    const chartWidth = 300;
    const paddingX = 20;
    const paddingY = 20;
    const usableHeight = chartHeight - paddingY * 2;
    const step = scores.length > 1 ? (chartWidth - paddingX * 2) / (scores.length - 1) : 0;
    
    const points = scores.map((s, i) => {
      const x = paddingX + step * i;
      const y = paddingY + (1 - s / maxScore) * usableHeight;
      return `${x},${y}`;
    }).join(' ');

    const dots = scores.map((s, i) => {
        const x = paddingX + step * i;
        const y = paddingY + (1 - s / maxScore) * usableHeight;
        return { x, y, val: s };
    });

    return { scores, labels, points, dots, avg: scores.reduce((a,b)=>a+b,0)/scores.length };
  }, [history]);

  const handleExport = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      examCount: history.length,
      knowledgeStats,
      trend: {
        labels: trendData.labels,
        scores: trendData.scores,
        avg: trendData.avg,
      },
      history,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student-profile-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', zIndex: 110,
      display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div className="history-modal" style={{ width: '90%', maxWidth: 400, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0}}>
          <h3>学情档案 (V4.0)</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
                className="close-capsule-btn" 
                onClick={handleExport}
                style={{ background: '#f0f9ff', color: '#1a73e8', border: 'none' }}
                title="导出档案"
            >
                <Download size={16} />
            </button>
            <button className="close-capsule-btn" onClick={onClose}>×</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, borderBottom: '1px solid #eee', paddingBottom: 8, flexShrink: 0 }}>
          <button 
            onClick={() => setActiveTab('trends')}
            style={{ 
              background: 'none', border: 'none', 
              fontWeight: activeTab === 'trends' ? 'bold' : 'normal',
              color: activeTab === 'trends' ? '#1a73e8' : '#666',
              borderBottom: activeTab === 'trends' ? '2px solid #1a73e8' : 'none',
              padding: '4px 0', cursor: 'pointer'
            }}
          >
            成绩走势
          </button>
          <button 
            onClick={() => setActiveTab('knowledge')}
            style={{ 
              background: 'none', border: 'none', 
              fontWeight: activeTab === 'knowledge' ? 'bold' : 'normal',
              color: activeTab === 'knowledge' ? '#1a73e8' : '#666',
              borderBottom: activeTab === 'knowledge' ? '2px solid #1a73e8' : 'none',
              padding: '4px 0', cursor: 'pointer'
            }}
          >
            知识图谱
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'trends' && (
            <div className="trends-view">
               {history.length < 2 ? (
                 <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>需要至少 2 次考试记录才能生成走势</div>
               ) : (
                 <>
                   <div style={{ background: '#f9f9f9', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                     <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>近期得分曲线</div>
                     <svg width="100%" height="150" viewBox="0 0 300 150">
                        <polyline points={trendData.points} fill="none" stroke="#1a73e8" strokeWidth="2" />
                        {trendData.dots.map((d, i) => (
                            <circle key={i} cx={d.x} cy={d.y} r="4" fill="#fff" stroke="#1a73e8" strokeWidth="2" />
                        ))}
                     </svg>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#999', marginTop: 4 }}>
                        {trendData.labels.map((l, i) => <span key={i}>{l}</span>)}
                     </div>
                   </div>
                   
                   <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 12 }}>历史考试列表</div>
                   {history.map((exam, index) => (
                        <div key={index} className="history-item" 
                            onClick={() => {
                                if (onSwitchExam) onSwitchExam(index);
                                onClose();
                            }}
                            style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}
                        >
                            <div>
                                <div style={{fontWeight: 'bold', fontSize: 14}}>
                                    {exam.studentInfo?.examName || '未命名考试'}
                                </div>
                                <div style={{fontSize: 12, color: '#999'}}>
                                    {new Date(exam.timestamp || Date.now()).toLocaleDateString()}
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                {exam.acceptanceResult?.passed && (
                                    <span style={{ fontSize: 10, background: '#E8F5E9', color: '#2E7D32', padding: '2px 6px', borderRadius: 4, marginRight: 8 }}>已验收</span>
                                )}
                                <span style={{fontSize: 16, fontWeight: 'bold', color: '#1a73e8'}}>
                                    {exam.summary?.totalScore}
                                </span>
                            </div>
                        </div>
                    ))}
                 </>
               )}
            </div>
          )}

          {activeTab === 'knowledge' && (
            <div className="knowledge-view">
              {knowledgeStats.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>暂无知识点数据</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {knowledgeStats.map((k, i) => (
                    <div key={i} style={{ 
                        background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: 12,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: 14, display: 'flex', alignItems: 'center' }}>
                                {k.name}
                                {k.trend === 'declining' && <span style={{ marginLeft: 6, fontSize: 10, background: '#FFEBEE', color: '#C62828', padding: '1px 4px', borderRadius: 2 }}>需关注</span>}
                                {k.trend === 'improving' && <span style={{ marginLeft: 6, fontSize: 10, background: '#E8F5E9', color: '#2E7D32', padding: '1px 4px', borderRadius: 2 }}>进步中</span>}
                            </div>
                            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                                出现 {k.appearances} 次 · 弱项 {k.asWeakness} 次 · 强项 {k.asStrength} 次
                            </div>
                        </div>
                        
                        {/* Mastery Bar */}
                        <div style={{ width: 60, height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ 
                                width: `${(k.asStrength / (k.asStrength + k.asWeakness || 1)) * 100}%`, 
                                height: '100%', 
                                background: '#4CAF50' 
                            }}></div>
                        </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
