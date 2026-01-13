// =================================================================================
// 低置信度确认对话框 (LowConfidenceConfirmDialog)
// 当识别置信度较低时，暂停分析并让用户确认
// =================================================================================

import React, { useState } from 'react';
import { AlertTriangle, Check, X, Edit } from 'lucide-react';
import './LowConfidenceConfirmDialog.css';

interface LowConfidenceConfirmDialogProps {
  isOpen: boolean;
  grade: string;
  subject: string;
  confidence: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  onConfirm: (action: 'continue' | 'modify' | 'cancel', grade?: string, subject?: string) => void;
}

export const LowConfidenceConfirmDialog: React.FC<LowConfidenceConfirmDialogProps> = ({
  isOpen,
  grade,
  subject,
  confidence,
  confidenceLevel,
  onConfirm
}) => {
  const [isModifying, setIsModifying] = useState(false);
  const [modifiedGrade, setModifiedGrade] = useState(grade);
  const [modifiedSubject, setModifiedSubject] = useState(subject);

  if (!isOpen) return null;

  const handleContinue = () => {
    onConfirm('continue');
  };

  const handleModify = () => {
    if (isModifying) {
      // 确认修改
      onConfirm('modify', modifiedGrade, modifiedSubject);
    } else {
      // 进入修改模式
      setIsModifying(true);
    }
  };

  const handleCancel = () => {
    onConfirm('cancel');
  };

  const getConfidenceColor = () => {
    if (confidence >= 0.7) return '#10b981';
    if (confidence >= 0.5) return '#f59e0b';
    return '#ef4444';
  };

  const getConfidenceText = () => {
    if (confidence >= 0.7) return '较高';
    if (confidence >= 0.5) return '中等';
    return '较低';
  };

  return (
    <div className="low-confidence-dialog-overlay">
      <div className="low-confidence-dialog">
        {/* 标题 */}
        <div className="dialog-header">
          <div className="dialog-icon warning">
            <AlertTriangle size={24} />
          </div>
          <h3 className="dialog-title">识别置信度较低，建议人工确认</h3>
        </div>

        {/* 内容 */}
        <div className="dialog-content">
          <div className="confidence-info">
            <div className="confidence-label">识别置信度</div>
            <div className="confidence-value" style={{ color: getConfidenceColor() }}>
              {(confidence * 100).toFixed(0)}% ({getConfidenceText()})
            </div>
          </div>

          <div className="recognition-result">
            <div className="result-label">识别结果：</div>
            
            {!isModifying ? (
              <div className="result-display">
                <div className="result-item">
                  <span className="result-key">年级：</span>
                  <span className="result-value">{grade}</span>
                </div>
                <div className="result-item">
                  <span className="result-key">学科：</span>
                  <span className="result-value">{subject}</span>
                </div>
              </div>
            ) : (
              <div className="result-edit">
                <div className="form-group">
                  <label>年级</label>
                  <select
                    value={modifiedGrade}
                    onChange={(e) => setModifiedGrade(e.target.value)}
                    className="form-select"
                  >
                    <option value="小学一年级">小学一年级</option>
                    <option value="小学二年级">小学二年级</option>
                    <option value="小学三年级">小学三年级</option>
                    <option value="小学四年级">小学四年级</option>
                    <option value="小学五年级">小学五年级</option>
                    <option value="小学六年级">小学六年级</option>
                    <option value="初一">初一</option>
                    <option value="初二">初二</option>
                    <option value="初三">初三</option>
                    <option value="高一">高一</option>
                    <option value="高二">高二</option>
                    <option value="高三">高三</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>学科</label>
                  <select
                    value={modifiedSubject}
                    onChange={(e) => setModifiedSubject(e.target.value)}
                    className="form-select"
                  >
                    <option value="语文">语文</option>
                    <option value="数学">数学</option>
                    <option value="英语">英语</option>
                    <option value="物理">物理</option>
                    <option value="化学">化学</option>
                    <option value="生物">生物</option>
                    <option value="历史">历史</option>
                    <option value="地理">地理</option>
                    <option value="政治">政治</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="dialog-hint">
            <p>💡 识别置信度较低可能导致分析结果不准确。</p>
            <p>建议您确认或修正识别结果后再继续分析。</p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="dialog-actions">
          <button
            className="dialog-btn secondary"
            onClick={handleCancel}
          >
            <X size={18} />
            <span>取消分析</span>
          </button>

          {!isModifying ? (
            <>
              <button
                className="dialog-btn primary"
                onClick={handleContinue}
              >
                <Check size={18} />
                <span>继续分析</span>
              </button>
              <button
                className="dialog-btn warning"
                onClick={handleModify}
              >
                <Edit size={18} />
                <span>修正后继续</span>
              </button>
            </>
          ) : (
            <button
              className="dialog-btn primary"
              onClick={handleModify}
            >
              <Check size={18} />
              <span>确认修正</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
