// =================================================================================
// 低置信度警告横幅组件 (LowConfidenceWarning)
// 当识别置信度较低时显示警告，提供重新拍照或手动修正的建议
// =================================================================================

import React from 'react';
import { AlertTriangle, Camera, Edit3, X } from 'lucide-react';
import './LowConfidenceWarning.css';

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'very-low';

interface LowConfidenceWarningProps {
  level: ConfidenceLevel;
  confidence: number;
  grade?: string;
  subject?: string;
  onRetake?: () => void;
  onCorrect?: () => void;
  onClose?: () => void;
}

export const LowConfidenceWarning: React.FC<LowConfidenceWarningProps> = ({
  level,
  confidence,
  grade,
  subject,
  onRetake,
  onCorrect,
  onClose
}) => {
  // 只在低置信度时显示
  if (level === 'high' || level === 'medium') {
    return null;
  }

  const percentage = Math.round(confidence * 100);
  const isVeryLow = level === 'very-low';

  const getMessage = () => {
    if (isVeryLow) {
      return {
        title: '识别置信度极低',
        description: `当前识别结果（${grade} · ${subject}）的置信度仅为 ${percentage}%，强烈建议重新拍照以获得更准确的分析结果。`,
        severity: 'critical'
      };
    }
    return {
      title: '识别置信度较低',
      description: `当前识别结果（${grade} · ${subject}）的置信度为 ${percentage}%，建议确认或重新拍照以提高准确性。`,
      severity: 'warning'
    };
  };

  const { title, description, severity } = getMessage();

  return (
    <div className={`low-confidence-warning ${severity}`}>
      <div className="warning-content">
        <div className="warning-icon">
          <AlertTriangle size={24} />
        </div>
        
        <div className="warning-text">
          <h3 className="warning-title">{title}</h3>
          <p className="warning-description">{description}</p>
        </div>

        <div className="warning-actions">
          {onRetake && (
            <button 
              className="warning-btn primary"
              onClick={onRetake}
              title="重新拍照上传"
            >
              <Camera size={16} />
              <span>重新拍照</span>
            </button>
          )}
          
          {onCorrect && (
            <button 
              className="warning-btn secondary"
              onClick={onCorrect}
              title="手动修正识别结果"
            >
              <Edit3 size={16} />
              <span>手动修正</span>
            </button>
          )}
        </div>

        {onClose && (
          <button 
            className="warning-close"
            onClick={onClose}
            title="关闭提示"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* 进度条指示器 */}
      <div className="confidence-indicator">
        <div 
          className="confidence-bar"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
