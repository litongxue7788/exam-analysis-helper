// =================================================================================
// 设置弹窗组件 (SettingsModal) - 重构版
// =================================================================================

import React, { useState } from 'react';
import { ModelSelector } from './ModelSelector';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentInfo: {
    name: string;
    grade: string;
    subject: string;
    className: string;
  };
  onUpdateStudentInfo: (info: any) => void;
  llmConfig: {
    provider: string;
    apiKey: string;
    modelId: string;
  };
  onUpdateLlmConfig: (config: any) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  studentInfo,
  onUpdateStudentInfo,
  llmConfig,
  onUpdateLlmConfig,
}) => {
  // 本地状态仅保留 UI 控制
  const [isAdminMode, setIsAdminMode] = useState(false);

  // 如果 isOpen 为 false，也可以渲染，但通过 CSS 隐藏（为了动画效果），或者直接不渲染
  // 为了简单起见，这里直接用条件渲染 + 简单的样式覆盖
  if (!isOpen) return null;

  // 模型名称映射
  const getModelName = (id: string) => {
    const map: Record<string, string> = {
      'doubao': '豆包',
      'aliyun': '通义',
      'zhipu': '智谱',
      'deepseek': 'DeepSeek'
    };
    return map[id] || id;
  };

  return (
    <div className="settings-overlay">
      <div className="settings-drawer">
        <div className="settings-header">
          <h3>基本信息设置</h3>
          <button className="close-capsule-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="settings-body">
          <div className="form-group">
            <label>学生姓名</label>
            <input 
              type="text" 
              className="styled-input"
              value={studentInfo.name}
              onChange={e => onUpdateStudentInfo({...studentInfo, name: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>学号 (可选)</label>
            <input 
              type="text" 
              className="styled-input"
              value={studentInfo.id || ''}
              onChange={e => onUpdateStudentInfo({...studentInfo, id: e.target.value})}
            />
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label>年级</label>
              <input 
                type="text" 
                className="styled-input"
                value={studentInfo.grade}
                onChange={e => onUpdateStudentInfo({...studentInfo, grade: e.target.value})}
              />
            </div>
            <div className="form-group flex-1">
              <label>班级</label>
              <input 
                type="text" 
                className="styled-input"
                value={studentInfo.className}
                onChange={e => onUpdateStudentInfo({...studentInfo, className: e.target.value})}
              />
            </div>
          </div>

          <div className="form-group">
            <label>学科</label>
            <input 
              type="text" 
              className="styled-input"
              value={studentInfo.subject}
              onChange={e => onUpdateStudentInfo({...studentInfo, subject: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>考试名称</label>
            <input 
              type="text" 
              className="styled-input"
              placeholder="如：期中考试"
              value={studentInfo.examName || ''}
              onChange={e => onUpdateStudentInfo({...studentInfo, examName: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>考试时间</label>
            <input 
              type="date" 
              className="styled-input"
              value={studentInfo.examTime || ''}
              onChange={e => onUpdateStudentInfo({...studentInfo, examTime: e.target.value})}
            />
          </div>

          <div className="divider-line"></div>

          <div className="button-group-row">
             <button className="secondary-btn flex-1" onClick={onClose}>取消</button>
             <button className="primary-btn flex-1" onClick={onClose}>保存并关闭</button>
          </div>

          {/* 管理员模式开关 (折叠) */}
          <div className="admin-toggle-area" style={{marginTop: 20, opacity: 0.6}}>
            <div className="toggle-row">
              <span style={{fontSize: 12}}>高级设置 (管理员)</span>
              <label className="toggle-switch scale-75">
                <input 
                  type="checkbox" 
                  checked={isAdminMode} 
                  onChange={e => setIsAdminMode(e.target.checked)} 
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>

          {isAdminMode && (
            <>
              <div className="divider-line"></div>
              <div className="model-select-section">
                <div className="section-label">模型选择</div>
                <ModelSelector 
                  selectedModelId={llmConfig.provider} 
                  onSelectModel={(id) => onUpdateLlmConfig({...llmConfig, provider: id})}
                />
              </div>

              {llmConfig.provider === 'doubao' ? (
                <>
                  <div className="form-item">
                     <label>豆包 Model ID (Endpoint ID)</label>
                     <input 
                       type="text" 
                       className="styled-input"
                       placeholder="请输入豆包模型 ID"
                       value={llmConfig.modelId || ''}
                       onChange={e => onUpdateLlmConfig({...llmConfig, modelId: e.target.value})}
                     />
                  </div>
                  <div className="form-item">
                     <label>豆包 API Key</label>
                     <input 
                       type="text" 
                       className="styled-input"
                       placeholder="请输入豆包 API Key"
                       value={llmConfig.apiKey || ''}
                       onChange={e => onUpdateLlmConfig({...llmConfig, apiKey: e.target.value})}
                     />
                  </div>
                </>
              ) : (
                <div className="form-item">
                  <label>{getModelName(llmConfig.provider)} API Key</label>
                  <input 
                    type="text" 
                    className="styled-input"
                    placeholder={`请输入 ${getModelName(llmConfig.provider)} API Key`}
                    value={llmConfig.apiKey || ''}
                    onChange={e => onUpdateLlmConfig({...llmConfig, apiKey: e.target.value})}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
