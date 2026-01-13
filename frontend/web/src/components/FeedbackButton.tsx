// =================================================================================
// 浮动反馈按钮组件 (FeedbackButton)
// 固定在页面右下角的浮动操作按钮
// =================================================================================

import React from 'react';
import { MessageCircle } from 'lucide-react';
import './FeedbackButton.css';

interface FeedbackButtonProps {
  onClick: () => void;
  pulse?: boolean;
}

export const FeedbackButton: React.FC<FeedbackButtonProps> = ({
  onClick,
  pulse = true
}) => {
  return (
    <button 
      className={`feedback-fab ${pulse ? 'pulse' : ''}`}
      onClick={onClick}
      title="反馈与建议"
    >
      <MessageCircle size={24} />
      <span className="fab-label">反馈</span>
    </button>
  );
};
