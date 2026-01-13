// =================================================================================
// 骨架屏加载组件 (SkeletonLoader)
// 在内容加载时显示占位动画
// =================================================================================

import React from 'react';
import './SkeletonLoader.css';

interface SkeletonLoaderProps {
  type?: 'card' | 'list' | 'text';
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  type = 'card',
  count = 1
}) => {
  if (type === 'card') {
    return (
      <div className="skeleton-container">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="skeleton-card">
            <div className="skeleton-header">
              <div className="skeleton-circle" />
              <div className="skeleton-text skeleton-title" />
            </div>
            <div className="skeleton-body">
              <div className="skeleton-text skeleton-line" />
              <div className="skeleton-text skeleton-line" />
              <div className="skeleton-text skeleton-line short" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="skeleton-container">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="skeleton-list-item">
            <div className="skeleton-circle small" />
            <div className="skeleton-text skeleton-line" />
          </div>
        ))}
      </div>
    );
  }

  // type === 'text'
  return (
    <div className="skeleton-container">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="skeleton-text skeleton-line" />
      ))}
    </div>
  );
};
