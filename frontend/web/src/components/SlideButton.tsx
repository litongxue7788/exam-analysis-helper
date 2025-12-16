// =================================================================================
// 底部滑块翻页组件 (SlideButton)
// =================================================================================

import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';

interface SlideButtonProps {
  onSlideComplete: () => void;
  text?: string;
  isLoading?: boolean;
}

export const SlideButton: React.FC<SlideButtonProps> = ({ 
  onSlideComplete, 
  text = '开始分析',
  isLoading = false
}) => {
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const maxDrag = 220; // 最大拖动距离

  const handleStart = (clientX: number) => {
    if (isLoading) return;
    setIsDragging(true);
    setStartX(clientX);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || isLoading) return;
    const diff = clientX - startX;
    if (diff > 0 && diff <= maxDrag) {
      setCurrentX(diff);
    }
  };

  const handleEnd = () => {
    if (!isDragging || isLoading) return;
    setIsDragging(false);
    
    if (currentX > maxDrag * 0.8) {
      // 触发成功
      setCurrentX(maxDrag);
      onSlideComplete();
      // 稍后复位
      setTimeout(() => setCurrentX(0), 1000);
    } else {
      // 回弹
      setCurrentX(0);
    }
  };

  // 鼠标事件适配
  const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX);
  const onMouseMove = (e: React.MouseEvent) => handleMove(e.clientX);
  const onMouseUp = () => handleEnd();
  
  // 触摸事件适配
  const onTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX);
  const onTouchEnd = () => handleEnd();

  return (
    <div 
      className={`slide-btn-container ${isLoading ? 'loading' : ''}`} 
      ref={containerRef}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <div className="slide-track-text">{isLoading ? '分析中...' : text}</div>
      <div 
        className="slide-handle"
        style={{ transform: `translateX(${currentX}px)` }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <ChevronRight size={24} color="#B7950B" />
      </div>
      <div 
        className="slide-bg-active" 
        style={{ width: currentX + 50 }} 
      />
    </div>
  );
};
