// =================================================================================
// 错题本 (Error Ledger) - Phase 2: V2.0
// =================================================================================

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Filter, Search, BookOpen, Tag, MoreHorizontal, Printer, Sparkles, RefreshCcw } from 'lucide-react';
import { ErrorItem } from '../types/notebook';

interface ErrorLedgerProps {
  onBack: () => void;
  // 暂时传入 mock 数据或从 localStorage 读取
}

export const ErrorLedger: React.FC<ErrorLedgerProps> = ({ onBack }) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'unsolved' | 'solved'>('unsolved');
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  
  // 模拟 AI 生成变式题的状态
  const [similarQuestions, setSimilarQuestions] = useState<Record<string, {
    question: string;
    answer: string;
  }[]>>({});

  const handlePrint = () => {
    const node = printRef.current;
    if (!node) return;

    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) return;

    const documentTitle = '错题本导出';
    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${documentTitle}</title>
    <style>
      @page { margin: 16mm; }
      body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, "Noto Sans", "PingFang SC", "Microsoft YaHei", sans-serif;
        color: #111827;
      }
    </style>
  </head>
  <body>
    ${node.innerHTML}
  </body>
</html>`);
    printWindow.document.close();
    printWindow.focus();

    window.setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 200);
  };

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Mock Data for visualization (Move to state for interactivity)
  const [errors, setErrors] = useState<ErrorItem[]>([
    {
      id: '1',
      sourceExamId: 'exam-001',
      sourceExamName: '七年级上册数学期中考试',
      createTime: '2023-11-15',
      questionText: '已知 a, b 互为相反数，c, d 互为倒数，x 的绝对值是 2，求 x^2 - (a+b+cd)x + (a+b)^2023 + (-cd)^2024 的值。',
      knowledgePoints: ['有理数运算', '代数式求值'],
      errorType: 'calculation',
      tags: ['#粗心', '#计算错误'],
      masteryLevel: 30,
      reviewCount: 1,
      isResolved: false
    },
    {
      id: '2',
      sourceExamId: 'exam-001',
      sourceExamName: '七年级上册数学期中考试',
      createTime: '2023-11-15',
      questionText: '如图，在数轴上点 A 表示的数是 -2，点 B 表示的数是 8，点 P 从点 A 出发...',
      knowledgePoints: ['数轴动点问题', '一元一次方程'],
      errorType: 'concept',
      tags: ['#数形结合', '#难题'],
      masteryLevel: 10,
      reviewCount: 0,
      isResolved: false
    }
  ]);

  const handleGenerateSimilar = (errorId: string) => {
    if (generatingId) return;
    setGeneratingId(errorId);
    
    // 模拟 API 调用延迟
    setTimeout(() => {
      setSimilarQuestions(prev => ({
        ...prev,
        [errorId]: [
          {
            question: '变式题1：已知 x, y 互为相反数，m, n 互为倒数，求 (x+y)^2024 - mn 的值。',
            answer: '-1'
          },
          {
            question: '变式题2：若 |a| = 5, |b| = 3，且 a < b，求 a - b 的值。',
            answer: '-8 或 -2'
          }
        ]
      }));
      setGeneratingId(null);
    }, 1500);
  };

  const handleAddTag = (errorId: string) => {
    const input = window.prompt('输入标签（例如：#粗心）');
    const tag = String(input || '').trim();
    if (!tag) return;

    setErrors(prev =>
      prev.map(item => {
        if (item.id !== errorId) return item;
        const nextTags = item.tags.includes(tag) ? item.tags : [...item.tags, tag];
        return { ...item, tags: nextTags };
      })
    );
  };

  return (
    <div className="report-layout">
      {/* 1. Left Dock (Desktop) */}
      <div className="left-rail mobile-hidden">
        <button className="dock-btn" onClick={onBack} title="返回首页">
          <ArrowLeft size={24} />
          <span>返回</span>
        </button>
        <div style={{ width: '80%', height: 1, background: '#e2e8f0', margin: '8px 0' }} />
        <button className="dock-btn active" title="错题本">
          <BookOpen size={24} color="#3B82F6" />
          <span style={{color: '#3B82F6'}}>错题本</span>
        </button>
      </div>

      {/* 2. Top Context Bar */}
      <div className="context-bar">
        <div className="context-left">
          <div className="context-back mobile-only">
            <button className="settings-btn" onClick={onBack}>
              <ArrowLeft size={20} color="#64748b" />
            </button>
          </div>
          <div className="context-info">
            <div className="context-title">错题本 (Error Ledger)</div>
            <div className="context-meta">
              <span>数学</span>
              <span>•</span>
              <span>共 {errors.length} 题</span>
            </div>
          </div>
        </div>
        
        <div className="stage-progress">
          <button 
            className={`stage-step ${activeFilter === 'unsolved' ? 'active' : ''}`}
            onClick={() => setActiveFilter('unsolved')}
          >
            待攻克
          </button>
          <button 
            className={`stage-step ${activeFilter === 'solved' ? 'active' : ''}`}
            onClick={() => setActiveFilter('solved')}
          >
            已掌握
          </button>
        </div>

        <div className="context-actions">
           <button 
             className="op-btn-secondary" 
             onClick={() => handlePrint()}
             title="导出错题本"
             style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 13 }}
           >
             <Printer size={16} />
             <span className="mobile-hidden">导出 PDF</span>
           </button>
        </div>
      </div>

      {/* 3. Main Content Area */}
      <div className="report-content">
        <div className="cmd-card">
           <div className="cmd-card-header">
              <div className="cmd-card-title">
                <span>🎯</span> 待攻克错题
              </div>
              <div className="cmd-card-badge">{errors.filter(e => !e.isResolved).length} 题</div>
           </div>
           
           <div className="error-list" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {errors.map(item => (
                <div key={item.id} className="knowledge-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                         <span className="k-name">{item.sourceExamName}</span>
                         <span className="k-date" style={{ fontSize: 12, color: '#94a3b8' }}>{item.createTime}</span>
                      </div>
                      <button style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                        <MoreHorizontal size={16} color="#94a3b8" />
                      </button>
                    </div>

                    <div className="error-content" style={{ fontSize: 14, color: '#334155', lineHeight: 1.6 }}>
                      {item.questionText}
                    </div>

                    <div className="error-tags" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        {item.tags.map(tag => (
                          <span key={tag} style={{ 
                            fontSize: 12, 
                            color: '#3B82F6', 
                            background: '#eff6ff', 
                            padding: '4px 8px', 
                            borderRadius: 6 
                          }}>
                            {tag}
                          </span>
                        ))}
                        <span style={{ 
                            fontSize: 12, 
                            color: '#f59e0b', 
                            background: '#fffbeb', 
                            padding: '4px 8px', 
                            borderRadius: 6 
                        }}>
                          {item.errorType === 'calculation' ? '计算错误' : item.errorType}
                        </span>
                        
                        <button 
                            onClick={() => handleAddTag(item.id)}
                            style={{
                                fontSize: 12,
                                color: '#64748b',
                                background: 'transparent',
                                border: '1px dashed #cbd5e1',
                                padding: '3px 8px',
                                borderRadius: 6,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                            }}
                        >
                            <Tag size={12} />
                            添加
                        </button>
                    </div>

                    {/* Similar Questions Section */}
                    <div style={{ width: '100%', marginTop: 8 }}>
                       {!similarQuestions[item.id] ? (
                          <button 
                            onClick={() => handleGenerateSimilar(item.id)}
                            disabled={!!generatingId}
                            style={{
                              background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: 8,
                              padding: '8px 16px',
                              fontSize: 13,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              cursor: generatingId ? 'not-allowed' : 'pointer',
                              opacity: generatingId && generatingId !== item.id ? 0.5 : 1
                            }}
                          >
                            {generatingId === item.id ? (
                               <RefreshCcw size={14} className="spin" />
                            ) : (
                               <Sparkles size={14} />
                            )}
                            {generatingId === item.id ? '正在生成变式题...' : 'AI 举一反三'}
                          </button>
                       ) : (
                          <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, border: '1px solid #e2e8f0' }}>
                             <div style={{ fontSize: 13, fontWeight: 'bold', color: '#475569', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Sparkles size={14} color="#8b5cf6" />
                                推荐变式练习
                             </div>
                             {similarQuestions[item.id].map((sq, idx) => (
                               <div key={idx} style={{ marginBottom: 8, fontSize: 13, color: '#334155' }}>
                                  <div style={{ marginBottom: 4 }}>{sq.question}</div>
                                  <div style={{ color: '#64748b', fontSize: 12 }}>答案：{sq.answer}</div>
                               </div>
                             ))}
                          </div>
                       )}
                    </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Hidden Print Layout */}
      <div style={{ display: 'none' }}>
        <div ref={printRef} style={{ padding: 40, fontFamily: 'sans-serif' }}>
          <div style={{ textAlign: 'center', marginBottom: 30, borderBottom: '2px solid #333', paddingBottom: 20 }}>
            <h1 style={{ fontSize: 24, margin: 0 }}>错题攻克本</h1>
            <p style={{ marginTop: 10, color: '#666' }}>生成时间：{new Date().toLocaleDateString()}</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
            {errors.filter(e => activeFilter === 'all' || (activeFilter === 'unsolved' ? !e.isResolved : e.isResolved)).map((item, index) => (
              <div key={item.id} style={{ breakInside: 'avoid', border: '1px solid #eee', padding: 20, borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
                  <span style={{ fontWeight: 'bold', fontSize: 16 }}>题目 {index + 1}</span>
                  <span style={{ color: '#666', fontSize: 12 }}>来源：{item.sourceExamName}</span>
                </div>
                
                <div style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 20 }}>
                  {item.questionText}
                </div>
                
                <div style={{ display: 'flex', gap: 10, borderTop: '1px dashed #eee', paddingTop: 15 }}>
                   <div style={{ flex: 1 }}>
                     <div style={{ fontSize: 12, color: '#999', marginBottom: 5 }}>错误类型</div>
                     <div style={{ fontSize: 14 }}>{item.errorType === 'calculation' ? '计算错误' : item.errorType}</div>
                   </div>
                   <div style={{ flex: 2 }}>
                     <div style={{ fontSize: 12, color: '#999', marginBottom: 5 }}>知识点</div>
                     <div style={{ fontSize: 14 }}>{item.knowledgePoints.join('、')}</div>
                   </div>
                </div>
                
                <div style={{ marginTop: 20, height: 100, border: '1px solid #f0f0f0', borderRadius: 4, position: 'relative' }}>
                   <span style={{ position: 'absolute', top: 5, left: 10, fontSize: 12, color: '#ccc' }}>重做区域</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Right Inspector (Filters & Stats) */}
      {isDesktop && (
        <div className="right-inspector">
           <div className="inspector-header">
             <h3>筛选器</h3>
             <Filter size={16} color="#64748b" />
           </div>
           
           <div className="inspector-section">
             <div className="section-title">知识点</div>
             <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {['有理数', '一元一次方程', '几何图形'].map(k => (
                  <span key={k} style={{
                    fontSize: 12,
                    padding: '6px 12px',
                    borderRadius: 16,
                    border: '1px solid #e2e8f0',
                    color: '#64748b',
                    cursor: 'pointer'
                  }}>{k}</span>
                ))}
             </div>
           </div>

           <div className="inspector-section">
             <div className="section-title">搜索</div>
             <div className="search-box" style={{ 
               background: '#f1f5f9', 
               borderRadius: 8, 
               padding: '8px 12px', 
               display: 'flex', 
               alignItems: 'center',
               gap: 8,
               marginTop: 8
             }}>
               <Search size={14} color="#94a3b8" />
               <input 
                 type="text" 
                 placeholder="搜索题目内容..." 
                 style={{ border: 'none', background: 'none', outline: 'none', fontSize: 12, width: '100%' }}
               />
             </div>
           </div>
        </div>
      )}
    </div>
  );
};
