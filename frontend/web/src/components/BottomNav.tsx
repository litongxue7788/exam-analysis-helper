// =================================================================================
// 底部胶囊导航栏 (BottomNav)
// =================================================================================

import React from 'react';
import { PenLine, FileText } from 'lucide-react';

export type NavTab = 'analyze' | 'report';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="bottom-nav-wrapper">
      <div className="bottom-nav-capsule">
        <button 
          className={`nav-item ${activeTab === 'analyze' ? 'active' : ''}`}
          onClick={() => onTabChange('analyze')}
        >
          <PenLine size={18} />
          <span>分析</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'report' ? 'active' : ''}`}
          onClick={() => onTabChange('report')}
        >
          <FileText size={18} />
          <span>报告</span>
        </button>
      </div>
    </div>
  );
};
