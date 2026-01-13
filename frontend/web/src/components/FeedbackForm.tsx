// =================================================================================
// 用户反馈表单组件 (FeedbackForm)
// 滑出式抽屉设计，收集用户对分析结果的反馈
// =================================================================================

import React, { useState } from 'react';
import { X, Send, Star, CheckCircle } from 'lucide-react';
import './FeedbackForm.css';

export type FeedbackType = 'accuracy' | 'relevance' | 'speed' | 'ui' | 'other';

interface FeedbackFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (feedback: FeedbackData) => Promise<void>;
  jobId?: string;
}

export interface FeedbackData {
  type: FeedbackType;
  rating: number;
  comment: string;
  jobId?: string;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  jobId
}) => {
  const [selectedType, setSelectedType] = useState<FeedbackType>('accuracy');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const feedbackTypes = [
    { id: 'accuracy' as FeedbackType, label: '内容准确性', icon: '🎯' },
    { id: 'relevance' as FeedbackType, label: '练习题相关性', icon: '📝' },
    { id: 'speed' as FeedbackType, label: '分析速度', icon: '⚡' },
    { id: 'ui' as FeedbackType, label: '界面体验', icon: '✨' },
    { id: 'other' as FeedbackType, label: '其他', icon: '💬' }
  ];

  const handleSubmit = async () => {
    if (rating === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const feedbackData: FeedbackData = {
        type: selectedType,
        rating,
        comment,
        jobId
      };

      if (onSubmit) {
        await onSubmit(feedbackData);
      }

      setIsSubmitted(true);
      setTimeout(() => {
        onClose();
        // 重置表单
        setTimeout(() => {
          setSelectedType('accuracy');
          setRating(0);
          setComment('');
          setIsSubmitted(false);
        }, 300);
      }, 2000);
    } catch (error) {
      console.error('提交反馈失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 遮罩层 */}
      <div className="feedback-overlay" onClick={onClose} />

      {/* 抽屉 */}
      <div className={`feedback-drawer ${isOpen ? 'open' : ''}`}>
        {isSubmitted ? (
          // 提交成功动画
          <div className="feedback-success">
            <div className="success-icon">
              <CheckCircle size={64} />
            </div>
            <h2 className="success-title">感谢您的反馈！</h2>
            <p className="success-message">您的意见对我们非常重要</p>
          </div>
        ) : (
          <>
            {/* 头部 */}
            <div className="feedback-header">
              <h2 className="feedback-title">反馈与建议</h2>
              <button className="feedback-close" onClick={onClose}>
                <X size={24} />
              </button>
            </div>

            {/* 内容 */}
            <div className="feedback-content">
              {/* 反馈类型选择 */}
              <div className="feedback-section">
                <label className="feedback-label">反馈类型</label>
                <div className="feedback-types">
                  {feedbackTypes.map((type) => (
                    <button
                      key={type.id}
                      className={`feedback-type-btn ${selectedType === type.id ? 'active' : ''}`}
                      onClick={() => setSelectedType(type.id)}
                    >
                      <span className="type-icon">{type.icon}</span>
                      <span className="type-label">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 星级评分 */}
              <div className="feedback-section">
                <label className="feedback-label">
                  评分 {rating > 0 && <span className="rating-text">({rating} 星)</span>}
                </label>
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      className={`star-btn ${star <= (hoveredRating || rating) ? 'active' : ''}`}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                    >
                      <Star size={32} fill={star <= (hoveredRating || rating) ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>

              {/* 文字评论 */}
              <div className="feedback-section">
                <label className="feedback-label">
                  详细说明 <span className="optional">(可选)</span>
                </label>
                <textarea
                  className="feedback-textarea"
                  placeholder="请告诉我们您的想法和建议..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  maxLength={500}
                />
                <div className="char-count">{comment.length}/500</div>
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="feedback-footer">
              <button className="feedback-btn cancel" onClick={onClose}>
                取消
              </button>
              <button
                className="feedback-btn submit"
                onClick={handleSubmit}
                disabled={rating === 0 || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner" />
                    <span>提交中...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>提交反馈</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};
