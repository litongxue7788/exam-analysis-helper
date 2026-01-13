// =================================================================================
// 历史记录列表组件
// =================================================================================

import React, { useState, useEffect } from 'react';
import { Clock, Trash2, X } from 'lucide-react';
import { getHistory, deleteHistory, HistoryRecord } from '../utils/historyManager';

interface HistoryListProps {
  onSelect: (record: HistoryRecord) => void;
  onClose: () => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ onSelect, onClose }) => {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    setLoading(true);
    try {
      const history = getHistory();
      // 只显示最近 5 条
      setRecords(history.slice(0, 5));
    } catch (error) {
      console.error('加载历史记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    if (window.confirm('确定要删除这条历史记录吗？')) {
      deleteHistory(id);
      loadHistory();
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // 小于 1 分钟
    if (diff < 60 * 1000) {
      return '刚刚';
    }
    
    // 小于 1 小时
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `${minutes} 分钟前`;
    }
    
    // 小于 24 小时
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours} 小时前`;
    }
    
    // 小于 7 天
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      return `${days} 天前`;
    }
    
    // 显示完整日期
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getScoreColor = (score: number, fullScore: number) => {
    const percentage = (score / fullScore) * 100;
    if (percentage >= 90) return '#2E7D32';
    if (percentage >= 80) return '#0277BD';
    if (percentage >= 60) return '#FF8F00';
    return '#C62828';
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #eee',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} color="#666" />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
              历史记录
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f5f5f5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
            }}
          >
            <X size={20} color="#666" />
          </button>
        </div>

        {/* 内容区域 */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '16px 24px',
          }}
        >
          {loading ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#999',
              }}
            >
              加载中...
            </div>
          ) : records.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#999',
              }}
            >
              <Clock size={48} color="#ddd" style={{ marginBottom: '16px' }} />
              <p style={{ margin: 0 }}>暂无历史记录</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {records.map((record) => (
                <div
                  key={record.id}
                  onClick={() => onSelect(record)}
                  style={{
                    border: '1px solid #eee',
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    gap: '16px',
                    background: '#fff',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#2563eb';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#eee';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* 缩略图 */}
                  {record.thumbnail ? (
                    <div
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        flexShrink: 0,
                        background: '#f5f5f5',
                      }}
                    >
                      <img
                        src={record.thumbnail}
                        alt="缩略图"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: '32px',
                      }}
                    >
                      📄
                    </div>
                  )}

                  {/* 信息 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                      }}
                    >
                      <h4
                        style={{
                          margin: 0,
                          fontSize: '16px',
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {record.studentInfo.examName}
                      </h4>
                      <button
                        onClick={(e) => handleDelete(e, record.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '4px',
                          transition: 'background 0.2s',
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#ffebee';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'none';
                        }}
                      >
                        <Trash2 size={16} color="#C62828" />
                      </button>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '8px',
                        fontSize: '14px',
                        color: '#666',
                      }}
                    >
                      <span>{record.studentInfo.grade}</span>
                      <span>·</span>
                      <span>{record.studentInfo.subject}</span>
                      <span>·</span>
                      <span
                        style={{
                          fontWeight: 600,
                          color: getScoreColor(
                            record.summary.totalScore,
                            record.summary.fullScore
                          ),
                        }}
                      >
                        {record.summary.totalScore}/{record.summary.fullScore}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: '12px',
                        color: '#999',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Clock size={12} />
                      {formatDate(record.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
