// =================================================================================
// 置信度徽章组件 (ConfidenceBadge)
// 显示识别结果的置信度等级，支持4种颜色方案和悬停提示
// =================================================================================

import React, { useState } from 'react';
import './ConfidenceBadge.css';

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'very-low';

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
  confidence: number;
  showDetails?: boolean;
  compact?: boolean;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  level,
  confidence,
  showDetails = false,
  compact = false
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const config = {
    high: { 
      icon: '✓', 
      label: '高置信度', 
      color: '#10b981',
      bg: '#E8F5E9',
      hint: '识别结果可靠，可以放心使用'
    },
    medium: { 
      icon: '!', 
      label: '中等置信度', 
      color: '#f59e0b',
      bg: '#FFF8E1',
      hint: '建议人工确认识别结果'
    },
    low: { 
      icon: '⚠', 
      label: '低置信度', 
      color: '#ef4444',
      bg: '#FFEBEE',
      hint: '建议重新拍照或手动修正'
    },
    'very-low': { 
      icon: '⚠', 
      label: '极低置信度', 
      color: '#dc2626',
      bg: '#FFEBEE',
      hint: '强烈建议重新拍照'
    }
  };

  const { icon, label, color, bg, hint } = config[level];
  const percentage = Math.round(confidence * 100);

  return (
    <div 
      className={`confidence-badge confidence-${level} ${compact ? 'compact' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: bg,
        color: color,
        borderColor: color,
      }}
    >
      <span className="badge-icon">{icon}</span>
      {!compact && (
        <>
          <span className="badge-label">{label}</span>
          <span className="badge-percentage">{percentage}%</span>
        </>
      )}
      {compact && (
        <span className="badge-percentage">{percentage}%</span>
      )}
      
      {(showDetails || isHovered) && (
        <div className="badge-tooltip">
          <div className="tooltip-header">
            <span className="tooltip-icon">{icon}</span>
            <span className="tooltip-title">{label}</span>
          </div>
          <div className="tooltip-body">
            <p className="tooltip-confidence">置信度：{percentage}%</p>
            <p className="tooltip-hint">{hint}</p>
          </div>
        </div>
      )}
    </div>
  );
};
