// =================================================================================
// 设置弹窗组件 (SettingsModal) - 重构版
// =================================================================================

import React, { useEffect, useRef, useState } from 'react';
import { ModelSelector } from './ModelSelector';
import { User, Plus, Trash2, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentInfo: {
    name: string;
    grade: string;
    subject: string;
    className: string;
    id?: string;
    examName?: string;
    examTime?: string;
  };
  onUpdateStudentInfo: (info: any) => void;
  profiles?: any[]; // StudentProfile[]
  currentProfileId?: string;
  onSwitchProfile?: (id: string) => void;
  onAddProfile?: () => void;
  onDeleteProfile?: (id: string) => void;
  trialAccessCode?: string;
  onUpdateTrialAccessCode?: (code: string) => void;
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
  profiles,
  currentProfileId,
  onSwitchProfile,
  onAddProfile,
  onDeleteProfile,
  trialAccessCode,
  onUpdateTrialAccessCode,
  llmConfig,
  onUpdateLlmConfig,
}) => {
  // 本地状态仅保留 UI 控制
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [adminSaving, setAdminSaving] = useState(false);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleHeaderPointerDown = (e: React.PointerEvent) => {
    if (!isDesktop) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: position.x,
      originY: position.y,
    };
  };

  const handleHeaderPointerMove = (e: React.PointerEvent) => {
    if (!isDesktop) return;
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    setPosition({ x: d.originX + dx, y: d.originY + dy });
  };

  const handleHeaderPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay">
      <div 
        className={`settings-drawer ${isDesktop ? 'hud-window' : ''}`}
        style={{
          transform: isDesktop ? `translate3d(${position.x}px, ${position.y}px, 0)` : undefined,
          transition: isDragging ? 'none' : undefined
        }}
      >
        <div 
          className="settings-header hud-header"
          onPointerDown={handleHeaderPointerDown}
          onPointerMove={handleHeaderPointerMove}
          onPointerUp={handleHeaderPointerUp}
          onPointerCancel={handleHeaderPointerUp}
        >
          <h3>基本信息设置</h3>
          <button className="close-capsule-btn" onClick={onClose} onPointerDown={(e) => e.stopPropagation()}>
            ×
          </button>
        </div>

        <div className="settings-body">
          {profiles && profiles.length > 0 && (
            <div className="profile-section" style={{ marginBottom: 24 }}>
               <div className="section-label" style={{ fontSize: 13, color: '#999', marginBottom: 12 }}>学生档案 (切换/管理)</div>
               <div className="profile-list" style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
                  {profiles.map(p => {
                    const isActive = p.id === currentProfileId;
                    return (
                      <div 
                        key={p.id} 
                        className={`profile-item ${isActive ? 'active' : ''}`}
                        onClick={() => onSwitchProfile && onSwitchProfile(p.id)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          cursor: 'pointer',
                          opacity: isActive ? 1 : 0.6,
                          minWidth: 56
                        }}
                      >
                         <div style={{
                           width: 48, height: 48, borderRadius: '50%', 
                           background: isActive ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : '#f1f5f9',
                           display: 'flex', alignItems: 'center', justifyContent: 'center',
                           border: isActive ? '2px solid white' : '1px solid #e2e8f0',
                           boxShadow: isActive ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none',
                           position: 'relative',
                           transition: 'all 0.2s'
                         }}>
                            {isActive ? <Check size={24} color="white" /> : <User size={24} color="#94a3b8" />}
                         </div>
                         <div style={{ marginTop: 6, fontSize: 12, fontWeight: isActive ? 'bold' : 'normal', color: '#334155', maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
                           {p.name}
                         </div>
                      </div>
                    );
                  })}
                  
                  {onAddProfile && (
                    <div 
                      className="profile-item-add"
                      onClick={onAddProfile}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', minWidth: 56, opacity: 0.8
                      }}
                    >
                       <div style={{
                         width: 48, height: 48, borderRadius: '50%', border: '2px dashed #cbd5e1',
                         display: 'flex', alignItems: 'center', justifyContent: 'center',
                         background: '#fff'
                       }}>
                          <Plus size={20} color="#94a3b8" />
                       </div>
                       <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>新建</div>
                    </div>
                  )}
               </div>
            </div>
          )}

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <label>学生姓名</label>
               {profiles && profiles.length > 1 && onDeleteProfile && currentProfileId && (
                  <button 
                    onClick={() => onDeleteProfile(currentProfileId)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, display: 'flex', alignItems: 'center', cursor: 'pointer', padding: 0 }}
                    title="删除当前档案"
                  >
                    <Trash2 size={12} style={{ marginRight: 4 }} /> 删除
                  </button>
               )}
            </div>
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
            <select 
              className="styled-input"
              value={studentInfo.subject}
              onChange={e => onUpdateStudentInfo({...studentInfo, subject: e.target.value})}
              style={{ appearance: 'none', background: 'white url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M7%2010l5%205%205-5z%22%20fill%3D%22%23999%22%2F%3E%3C%2Fsvg%3E") no-repeat right 10px center' }}
            >
              <option value="数学">数学</option>
              <option value="语文">语文</option>
              <option value="英语">英语</option>
            </select>
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

          {typeof trialAccessCode === 'string' && onUpdateTrialAccessCode && (
            <div className="form-group">
              <label>试点访问口令</label>
              <input
                type="password"
                className="styled-input"
                placeholder="用于小范围试点的访问校验"
                value={trialAccessCode}
                onChange={(e) => onUpdateTrialAccessCode(e.target.value)}
              />
            </div>
          )}

          <div className="admin-toggle-area" style={{marginTop: 20, opacity: 0.8}}>
            <div className="toggle-row" style={{justifyContent: 'space-between', alignItems: 'center'}}>
              <span style={{fontSize: 12}}>大模型服务由管理员统一配置，老师无需设置。</span>
              <button
                type="button"
                className="secondary-btn"
                style={{marginLeft: 8, padding: '4px 10px', fontSize: 12, flexShrink: 0}}
                onClick={() => setIsAdminMode(v => !v)}
              >
                管理员配置
              </button>
            </div>
          </div>

          {isAdminMode && (
            <>
              <div className="divider-line"></div>
              <div className="model-select-section">
                <div className="section-label">模型服务商</div>
                <ModelSelector 
                  selectedModelId={llmConfig.provider} 
                  onSelectModel={(id) => onUpdateLlmConfig({...llmConfig, provider: id})}
                />
              </div>
              <div className="form-item">
                 <label>管理员密码</label>
                 <input 
                   type="password" 
                   className="styled-input"
                   placeholder="仅管理员可填写"
                   value={adminPassword}
                   onChange={e => setAdminPassword(e.target.value)}
                 />
              </div>
              <div className="form-item">
                 <label>模型 ID / 接入点 ID</label>
                 <input 
                   type="text" 
                   className="styled-input"
                   placeholder="如豆包推理接入点 ID"
                   value={llmConfig.modelId || ''}
                   onChange={e => onUpdateLlmConfig({...llmConfig, modelId: e.target.value})}
                 />
              </div>
              <div className="form-item">
                 <label>API Key</label>
                 <input 
                   type="password" 
                   className="styled-input"
                   placeholder="请输入对应平台的 API Key"
                   value={llmConfig.apiKey || ''}
                   onChange={e => onUpdateLlmConfig({...llmConfig, apiKey: e.target.value})}
                 />
              </div>
              {adminMessage && (
                <div style={{fontSize: 12, color: adminMessage.includes('成功') || adminMessage.includes('已保存') ? '#2E7D32' : '#C62828', marginTop: 4}}>
                  {adminMessage}
                </div>
              )}
              <div className="button-group-row" style={{marginTop: 12}}>
                <button
                  type="button"
                  className="primary-btn flex-1"
                  disabled={adminSaving}
                  onClick={async () => {
                    if (!adminPassword) {
                      setAdminMessage('请输入管理员密码');
                      return;
                    }
                    setAdminSaving(true);
                    setAdminMessage(null);
                    try {
                      const resp = await fetch('/api/admin/llm-config', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          ...(trialAccessCode ? { 'x-access-code': trialAccessCode } : {}),
                        },
                        body: JSON.stringify({
                          adminPassword,
                          provider: llmConfig.provider,
                          apiKey: llmConfig.apiKey,
                          modelId: llmConfig.modelId,
                        }),
                      });
                      const data = await resp.json().catch(() => ({}));
                      if (!resp.ok || !data.success) {
                        throw new Error(data.errorMessage || '保存失败，请检查密码和配置');
                      }
                      setAdminMessage('已保存到服务器，老师可以直接使用大模型分析。');
                    } catch (e: any) {
                      setAdminMessage(e.message || '保存失败，请稍后重试');
                    } finally {
                      setAdminSaving(false);
                    }
                  }}
                >
                  {adminSaving ? '保存中...' : '保存大模型配置到服务器'}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="settings-footer">
          <div className="button-group-row">
            <button className="secondary-btn flex-1" onClick={onClose}>取消</button>
            <button className="primary-btn flex-1" onClick={onClose}>保存并关闭</button>
          </div>
        </div>
      </div>
    </div>
  );
};
