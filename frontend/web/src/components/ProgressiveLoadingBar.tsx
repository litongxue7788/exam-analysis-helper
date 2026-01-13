// =================================================================================
// 渐进式加载条组件 (ProgressiveLoadingBar)
// 显示6阶段分析进度，带流动光效和脉冲动画
// =================================================================================

import React from 'react';
import './ProgressiveLoadingBar.css';

interface Stage {
  id: string;
  label: string;
  icon: string;
  status: 'pending' | 'active' | 'completed';
}

interface ProgressiveLoadingBarProps {
  currentStage: string;
  progress: number;
  estimatedTime: number;
}

export const ProgressiveLoadingBar: React.FC<ProgressiveLoadingBarProps> = ({
  currentStage,
  progress,
  estimatedTime
}) => {
  const stages: Stage[] = [
    { id: 'extracting', label: '识别中', icon: '🔍', status: 'pending' },
    { id: 'diagnosing', label: '分析中', icon: '🧠', status: 'pending' },
    { id: 'practicing', label: '生成练习', icon: '📝', status: 'pending' },
    { id: 'completed', label: '完成', icon: '✅', status: 'pending' }
  ];

  // 更新阶段状态
  const updatedStages = stages.map(stage => {
    const stageIndex = stages.findIndex(s => s.id === stage.id);
    const currentIndex = stages.findIndex(s => s.id === currentStage);
    
    if (stageIndex < currentIndex) {
      return { ...stage, status: 'completed' as const };
    } else if (stageIndex === currentIndex) {
      return { ...stage, status: 'active' as const };
    }
    return stage;
  });

  const getStageText = (stage: string) => {
    const texts: Record<string, string> = {
      extracting: '正在识别试卷内容...',
      extracted: '识别完成，开始分析...',
      diagnosing: '正在分析错因和知识点...',
      diagnosed: '分析完成，生成练习题...',
      practicing: '正在生成针对性练习题...',
      completed: '分析完成！'
    };
    return texts[stage] || '正在处理...';
  };

  return (
    <div className="progressive-loading">
      {/* 顶部状态栏 */}
      <div className="loading-header">
        <div className="loading-icon pulse">
          {updatedStages.find(s => s.id === currentStage)?.icon || '⚙️'}
        </div>
        <div className="loading-text">{getStageText(currentStage)}</div>
        <div className="loading-time">
          预计剩余 <span className="time-number">{estimatedTime}</span> 秒
        </div>
      </div>

      {/* 进度条 */}
      <div className="progress-track">
        <div 
          className="progress-fill" 
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        >
          <div className="progress-shimmer" />
        </div>
      </div>

      {/* 阶段指示器 */}
      <div className="stage-indicators">
        {updatedStages.map((stage, index) => (
          <React.Fragment key={stage.id}>
            <div className={`stage-dot ${stage.status}`}>
              <span className="stage-icon">{stage.icon}</span>
              <span className="stage-label">{stage.label}</span>
            </div>
            {index < updatedStages.length - 1 && (
              <div className={`stage-line ${stage.status === 'completed' ? 'completed' : ''}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
