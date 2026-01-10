import React from 'react';
import { X, BookOpen, Lightbulb } from 'lucide-react';

interface StudyMethodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  methods: string[];
  onSyncToReport?: (methods: string[]) => void;
}

export const StudyMethodsModal: React.FC<StudyMethodsModalProps> = ({ isOpen, onClose, methods, onSyncToReport }) => {
  if (!isOpen) return null;

  const copyText = (text: string) => {
    const v = String(text || '');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(v).catch(() => {});
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = v;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
    } catch {}
    document.body.removeChild(textarea);
  };

  const copyAll = () => {
    if (!methods.length) return;
    copyText(methods.map((m, i) => `${i + 1}. ${m}`).join('\n'));
  };

  return (
    <div className="settings-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="settings-modal" style={{ maxWidth: 500 }}>
        <div className="settings-header">
          <div className="settings-title">
            <BookOpen size={20} className="text-blue-600" />
            <span>AI 推荐学习方法</span>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="settings-content">
          {methods.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>
              暂无特定的学习方法建议，请继续保持良好的学习习惯。
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ 
                background: '#eff6ff', 
                padding: 12, 
                borderRadius: 8, 
                fontSize: 13, 
                color: '#1e40af',
                marginBottom: 4 
              }}>
                基于你的试卷错因，为你定制了以下高效学习策略：
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="op-btn-secondary" onClick={copyAll} style={{ flex: 1, justifyContent: 'center' }}>
                  复制全部
                </button>
                <button
                  className="op-btn-secondary"
                  onClick={() => onSyncToReport?.(methods)}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  同步到报告
                </button>
              </div>
              {methods.map((method, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  gap: 12, 
                  background: '#f8fafc', 
                  padding: 12, 
                  borderRadius: 8,
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ 
                    minWidth: 24, 
                    height: 24, 
                    background: '#3b82f6', 
                    color: '#fff', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 'bold',
                    marginTop: 2
                  }}>
                    {index + 1}
                  </div>
                  <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.5, flex: 1 }}>
                    {method}
                  </div>
                  <button
                    className="op-btn-secondary"
                    style={{ padding: '6px 10px', fontSize: 12, borderRadius: 8, flexShrink: 0 }}
                    onClick={() => copyText(method)}
                  >
                    复制
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="settings-footer">
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="op-btn-secondary"
              onClick={() => onSyncToReport?.(methods)}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              同步到报告
            </button>
            <button className="op-btn-primary" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>
              我知道了
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
