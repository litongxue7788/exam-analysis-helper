import React from 'react';
import { Eye, Image, AlertCircle } from 'lucide-react';
import './EvidenceSourceInfo.css';

interface EvidenceSource {
  problemIndex: number;
  imageIndex?: number;
  imageCount: number;
  confidence: string;
  canViewOriginal: boolean;
}

interface EvidenceSourceTracking {
  totalImages: number;
  analysisMethod: 'batch' | 'individual';
  trackingEnabled: boolean;
  sources: EvidenceSource[];
}

interface EvidenceSourceInfoProps {
  problemIndex: number;
  evidenceSourceTracking?: EvidenceSourceTracking;
  onViewOriginal?: (imageIndex?: number) => void;
}

export const EvidenceSourceInfo: React.FC<EvidenceSourceInfoProps> = ({
  problemIndex,
  evidenceSourceTracking,
  onViewOriginal
}) => {
  if (!evidenceSourceTracking || !evidenceSourceTracking.trackingEnabled) {
    return null;
  }

  const source = evidenceSourceTracking.sources.find(s => s.problemIndex === problemIndex);
  if (!source) {
    return null;
  }

  const getSourceText = () => {
    if (!source.canViewOriginal) {
      return '原图不可用';
    }

    if (source.imageIndex !== undefined) {
      return `第 ${source.imageIndex + 1} 张图片`;
    }

    if (source.imageCount === 1) {
      return '试卷图片';
    }

    return `试卷图片（共 ${source.imageCount} 张）`;
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case '高': return '#10b981';
      case '中': return '#f59e0b';
      case '低': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const handleViewOriginal = () => {
    if (onViewOriginal && source.canViewOriginal) {
      onViewOriginal(source.imageIndex);
    }
  };

  return (
    <div className="evidence-source-info">
      <div className="evidence-source-row">
        <div className="evidence-source-label">
          <Image size={14} />
          来源
        </div>
        <div className="evidence-source-content">
          <span className="source-text">{getSourceText()}</span>
          {source.canViewOriginal && (
            <button
              className="view-original-btn"
              onClick={handleViewOriginal}
              title="查看原图"
            >
              <Eye size={12} />
              查看
            </button>
          )}
        </div>
      </div>
      
      <div className="evidence-source-row">
        <div className="evidence-source-label">
          <AlertCircle size={14} />
          置信度
        </div>
        <div className="evidence-source-content">
          <span 
            className="confidence-badge"
            style={{ 
              backgroundColor: getConfidenceColor(source.confidence),
              color: 'white'
            }}
          >
            {source.confidence}
          </span>
        </div>
      </div>
    </div>
  );
};