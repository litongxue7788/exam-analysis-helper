// =================================================================================
// 智能确认横幅组件 (SmartConfirmBanner)
// 根据识别置信度显示不同的确认界面
// =================================================================================

import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, AlertCircle, X } from 'lucide-react';

interface RecognitionInfo {
  grade: string;
  subject: string;
  gradeConfidence: number;
  subjectConfidence: number;
  overallConfidence: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  needsConfirmation: boolean;
  source?: string;
}

interface SmartConfirmBannerProps {
  recognition: RecognitionInfo;
  onConfirm: () => void;
  onCorrect: (grade: string, subject: string) => Promise<void>;
  onClose?: () => void;
}

// 年级选项
const GRADE_OPTIONS = [
  '一年级', '二年级', '三年级', '四年级', '五年级', '六年级',
  '七年级', '八年级', '九年级',
  '高一', '高二', '高三'
];

// 学科选项
const SUBJECT_OPTIONS = [
  '语文', '数学', '英语', '物理', '化学', '生物',
  '政治', '历史', '地理', '科学', '道德与法治'
];

export const SmartConfirmBanner: React.FC<SmartConfirmBannerProps> = ({
  recognition,
  onConfirm,
  onCorrect,
  onClose
}) => {
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState(recognition.grade);
  const [selectedSubject, setSelectedSubject] = useState(recognition.subject);
  const [countdown, setCountdown] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { confidenceLevel, overallConfidence, needsConfirmation } = recognition;

  // 10秒自动确认
  useEffect(() => {
    if (!needsConfirmation) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onConfirm();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [needsConfirmation, onConfirm]);

  const handleCorrect = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onCorrect(selectedGrade, selectedSubject);
    } catch (error) {
      console.error('修正失败:', error);
      alert('修正失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 高置信度 - 绿色信息横幅
  if (confidenceLevel === 'high') {
    return (
      <div style={{
        margin: '16px 20px',
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        borderRadius: 12,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
        position: 'relative'
      }}>
        <CheckCircle size={24} color="#fff" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 2 }}>
            识别结果：{recognition.grade} {recognition.subject}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
            置信度：{(overallConfidence * 100).toFixed(0)}% · 自动使用
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              padding: '6px',
              borderRadius: 6,
              border: 'none',
              background: 'rgba(255,255,255,0.2)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>
    );
  }

  // 中等置信度 - 黄色确认横幅
  if (confidenceLevel === 'medium') {
    return (
      <div style={{
        margin: '16px 20px',
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        borderRadius: 12,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
      }}>
        <AlertTriangle size={24} color="#fff" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 2 }}>
            识别结果：{recognition.grade} {recognition.subject}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
            置信度：{(overallConfidence * 100).toFixed(0)}% · {countdown}秒后自动确认
          </div>
        </div>
        <button
          onClick={onConfirm}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            border: 'none',
            background: '#fff',
            color: '#d97706',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          确认
        </button>
        <button
          onClick={() => setShowCorrectionForm(true)}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            border: '1px solid rgba(255,255,255,0.5)',
            background: 'transparent',
            color: '#fff',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          修正
        </button>
      </div>
    );
  }

  // 低置信度 - 橙色修正横幅
  if (confidenceLevel === 'low') {
    if (!showCorrectionForm) {
      setShowCorrectionForm(true); // 低置信度直接显示修正表单
    }
  }

  // 修正表单
  if (showCorrectionForm) {
    return (
      <div style={{
        margin: '16px 20px',
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        borderRadius: 12,
        padding: '16px 20px',
        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <AlertCircle size={24} color="#fff" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 2 }}>
              识别结果可能不准确，请确认
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
              当前识别：{recognition.grade} {recognition.subject} (置信度：{(overallConfidence * 100).toFixed(0)}%)
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', marginBottom: 4, display: 'block' }}>
              年级
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: 'none',
                fontSize: 14,
                background: '#fff',
                color: '#333'
              }}
            >
              {GRADE_OPTIONS.map(grade => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', marginBottom: 4, display: 'block' }}>
              学科
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: 'none',
                fontSize: 14,
                background: '#fff',
                color: '#333'
              }}
            >
              {SUBJECT_OPTIONS.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {recognition.confidenceLevel !== 'high' && (
            <button
              onClick={() => setShowCorrectionForm(false)}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.5)',
                background: 'transparent',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              取消
            </button>
          )}
          <button
            onClick={handleCorrect}
            disabled={isSubmitting}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              background: '#fff',
              color: '#dc2626',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.6 : 1,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            {isSubmitting ? '重新分析中...' : '确认修正'}
          </button>
        </div>
        
        {recognition.confidenceLevel === 'low' && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 8, textAlign: 'center' }}>
            {countdown}秒后将自动使用当前选择
          </div>
        )}
      </div>
    );
  }

  return null;
};
