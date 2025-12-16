// =================================================================================
// 模型选择器组件 (ModelSelector)
// =================================================================================

import React from 'react';
import { Sparkles, Info } from 'lucide-react';

interface ModelOption {
  id: string;
  name: string;
  desc: string;
}

interface ModelSelectorProps {
  selectedModelId: string;
  onSelectModel: (id: string) => void;
}

const MODELS: ModelOption[] = [
  { id: 'doubao', name: '豆包', desc: '豆包 Pro，均衡之选' },
  { id: 'aliyun', name: '通义', desc: '通义千问，逻辑推理强' },
  { id: 'zhipu', name: '智谱', desc: 'ChatGLM 4，中文理解优' },
  { id: 'deepseek', name: 'DeepSeek', desc: '深度求索，代码与理科强' }, // 假装支持
];

export const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModelId, onSelectModel }) => {
  const currentModel = MODELS.find(m => m.id === selectedModelId) || MODELS[0];

  return (
    <div className="model-selector-container">
      <div className="selector-header">
        <Sparkles size={16} className="header-icon" />
        <span>选择AI模型</span>
      </div>

      {/* 横向滚动区域 */}
      <div className="models-scroll-view">
        {MODELS.map(model => (
          <button
            key={model.id}
            className={`model-chip ${selectedModelId === model.id ? 'active' : ''}`}
            onClick={() => onSelectModel(model.id)}
          >
            {model.name}
          </button>
        ))}
        {/* 占位，防止最后一个贴边 */}
        <div style={{ width: 8, flexShrink: 0 }}></div>
      </div>

      {/* 提示信息框 */}
      <div className="model-info-box">
        <div className="info-title">当前选择：{currentModel.name}</div>
        <div className="info-desc">{currentModel.desc}</div>
      </div>
    </div>
  );
};
