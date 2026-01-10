import React, { useEffect, useMemo, useState } from 'react';
import { Printer, Layout, CheckCircle, XCircle, HelpCircle, PlayCircle } from 'lucide-react';
import { LatexRenderer } from '../components/LatexRenderer';

interface PracticeSheetProps {
  data: any;
  onBack?: () => void;
  onAcceptanceComplete?: (result: any) => void;
}

export const PracticeSheet: React.FC<PracticeSheetProps> = ({ data, onBack, onAcceptanceComplete }) => {
  const studentInfo = data?.studentInfo || {
    name: '张三',
    grade: '七年级',
    subject: '数学',
    className: '2班',
    examName: '巩固练习卷'
  };

  const getThemeColor = (subject: string) => {
    const s = String(subject || '').toLowerCase();
    if (s.includes('数学') || s.includes('math')) return '#2563eb';
    if (s.includes('英语') || s.includes('english')) return '#16a34a';
    if (s.includes('语文') || s.includes('chinese')) return '#dc2626';
    if (s.includes('物理')) return '#7c3aed';
    if (s.includes('化学')) return '#0ea5e9';
    if (s.includes('生物')) return '#10b981';
    if (s.includes('历史')) return '#b45309';
    if (s.includes('地理')) return '#0284c7';
    if (s.includes('政治')) return '#c026d3';
    return '#2563eb';
  };

  const theme = useMemo(() => getThemeColor(studentInfo.subject), [studentInfo.subject]);
  const pageStyle = useMemo(() => {
    return { ['--theme' as any]: theme, ['--theme-cta' as any]: theme } as React.CSSProperties;
  }, [theme]);

  const practicePaper = data?.practicePaper;
  const practiceQuestions: string[] = data?.practiceQuestions || [];
  const problems = data?.modules?.problems || [];
  const practiceFocusSectionName = String((data as any)?.practiceFocusSectionName || '').trim();
  
  // 判断是否有结构化试卷或简单题目列表
  const hasPaper = !!(practicePaper && practicePaper.sections && practicePaper.sections.length > 0);
  const hasQuestions = practiceQuestions && practiceQuestions.length > 0;
  const hasContent = hasPaper || hasQuestions;

  // 模式切换: 'print' | 'acceptance'
  const [viewMode, setViewMode] = useState<'print' | 'acceptance'>('print');

  // 验收模式状态
  const [acceptanceState, setAcceptanceState] = useState<{
    answers: Record<string, boolean | null>; // true=pass, false=fail, null=unanswered
    hintsUsed: Record<string, boolean>;
    submitted: boolean;
  }>({
    answers: {},
    hintsUsed: {},
    submitted: false
  });

  // 扁平化题目列表用于验收
  const flatQuestions = React.useMemo(() => {
    if (hasPaper) {
      const list: any[] = [];
      practicePaper.sections.forEach((s: any) => {
        s.questions.forEach((q: any) => {
          list.push({ ...q, sectionName: s.name, id: q.no }); // Ensure ID
        });
      });
      return list;
    } else {
      return practiceQuestions.map((q, i) => ({
        no: i + 1,
        id: `q-${i}`,
        content: q,
        hints: [] // Simple strings have no hints usually
      }));
    }
  }, [hasPaper, practicePaper, practiceQuestions]);

  const focusTargetId = useMemo(() => {
    if (!hasPaper) return '';
    if (!practiceFocusSectionName) return '';
    const sections = Array.isArray(practicePaper?.sections) ? practicePaper.sections : [];
    const idx = sections.findIndex((s: any) => String(s?.name || '').trim() === practiceFocusSectionName);
    if (idx < 0) return '';
    return `paper-sec-${idx}`;
  }, [hasPaper, practicePaper?.sections, practiceFocusSectionName]);

  useEffect(() => {
    if (!focusTargetId) return;
    const el = document.getElementById(focusTargetId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('practice-highlight');
    const t = setTimeout(() => el.classList.remove('practice-highlight'), 1800);
    return () => clearTimeout(t);
  }, [focusTargetId]);

  // 打印选项状态
  const [printOptions, setPrintOptions] = useState({
    showDiagnosis: true,
    showHints: true,
    addWorkspace: true,
    layoutMode: 'list' // 'list' | 'a4' | 'card'
  });

  const escapeHtml = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const cleanPrint = (v: any) => {
    const controlCharsRe = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;
    const s = String(v ?? '')
      .replace(controlCharsRe, '')
      .replace(/\\f(?=\\)/g, '')
      .trim();
    return escapeHtml(s).replace(/\n/g, '<br/>');
  };

  const handleToggleHint = (id: string) => {
    setAcceptanceState(prev => ({
      ...prev,
      hintsUsed: { ...prev.hintsUsed, [id]: true }
    }));
  };

  const handleAnswer = (id: string, result: boolean) => {
    setAcceptanceState(prev => ({
      ...prev,
      answers: { ...prev.answers, [id]: result }
    }));
  };

  const handleSubmitAcceptance = () => {
    const total = flatQuestions.length;
    const passed = Object.values(acceptanceState.answers).filter(v => v === true).length;
    const failed = Object.values(acceptanceState.answers).filter(v => v === false).length;
    
    // 如果有未完成的
    if (passed + failed < total) {
      if (!window.confirm(`还有 ${total - passed - failed} 道题未标记结果，确定要提交吗？未标记将视为“未通过”。`)) {
        return;
      }
    }

    setAcceptanceState(prev => ({ ...prev, submitted: true }));
    
    // 触发完成回调
    if (onAcceptanceComplete) {
      const isPassed = failed === 0 && passed > 0; // All correct and at least one question
      onAcceptanceComplete({
        passed: isPassed,
        score: Math.round((passed / total) * 100),
        total,
        passedCount: passed,
        failedCount: failed,
        timestamp: new Date().toISOString(),
        details: acceptanceState
      });
    }
  };

  const handlePrintPractice = () => {
    if (!hasContent) {
      window.print();
      return;
    }

    const title = `${studentInfo.name}-${studentInfo.subject}-错题巩固本`;
    let contentHtml = '';

    // 1. 生成诊断部分 HTML
    let diagnosisHtml = '';
    if (printOptions.showDiagnosis && problems.length > 0) {
      diagnosisHtml = `
        <div class="section diagnosis-section">
          <h3>错题诊断摘要</h3>
          <div class="diagnosis-list">
            ${problems.map((p: any, i: number) => `
              <div class="diagnosis-item">
                <span class="d-index">${i + 1}.</span>
                <span class="d-name">【${cleanPrint(p.name)}】</span>
                <span class="d-desc">${cleanPrint(p.desc)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // 2. 生成练习题部分 HTML
    if (hasPaper) {
      contentHtml = practicePaper.sections.map((section: any) => `
        <div class="section">
          <h3>${cleanPrint(section.name)}</h3>
          <div class="questions">
            ${section.questions.map((q: any, i: number) => `
              <div class="question-item ${printOptions.addWorkspace ? 'with-workspace' : ''}">
                <div class="q-header">
                  <span class="q-no">${q.no}.</span>
                  <div class="q-content">${cleanPrint(q.content)}</div>
                </div>
                ${printOptions.showHints && q.hints && q.hints.length > 0 ? `
                  <div class="q-hints">
                    <div class="hint-label">💡 思路点拨：</div>
                    ${q.hints.map((h: string) => `<div>• ${cleanPrint(h)}</div>`).join('')}
                  </div>
                ` : ''}
                ${printOptions.addWorkspace ? `
                  <div class="q-workspace">
                    <div class="workspace-label">解题区：</div>
                    <div class="reflection">
                      <div class="reflection-label">错因自查：</div>
                      <div class="reflection-boxes">□ 概念不清　□ 计算失误　□ 审题漏条件　□ 步骤不完整　□ 时间不够</div>
                      <div class="reflection-line">复盘一句话：____________________________________________</div>
                    </div>
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `).join('');
    } else {
      contentHtml = `<ol>${practiceQuestions.map((q, index) => `
        <li class="${printOptions.addWorkspace ? 'with-workspace-simple' : ''}">
          <div class="simple-q-content">${cleanPrint(q)}</div>
          ${printOptions.addWorkspace ? `
            <div class="simple-reflection">错因自查：□ 概念不清 □ 计算失误 □ 审题漏条件 □ 步骤不完整 □ 时间不够</div>
            <div class="simple-workspace"></div>
            <div class="simple-reflection-line">复盘一句话：____________________________________________</div>
          ` : ''}
        </li>
      `).join('')}</ol>`;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const doc = printWindow.document;
    doc.write(`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: 'Times New Roman', 'SimSun', serif; margin: 40px; color: #000; line-height: 1.6; }
    h1 { text-align: center; font-size: 22px; margin-bottom: 10px; font-weight: bold; }
    .subtitle { text-align: center; font-size: 14px; margin-bottom: 24px; color: #333; }
    
    .student-info-bar { 
      display: flex; justify-content: space-between; 
      border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 24px; font-size: 14px;
    }
    
    .section { margin-bottom: 24px; }
    .section h3 { font-size: 16px; font-weight: bold; margin-bottom: 12px; border-left: 4px solid #000; padding-left: 8px; background: #f5f5f5; padding-top: 4px; padding-bottom: 4px; }
    
    /* 诊断部分 */
    .diagnosis-item { margin-bottom: 8px; font-size: 13px; }
    .d-index { font-weight: bold; margin-right: 4px; }
    .d-name { font-weight: bold; }
    
    /* 题目部分 */
    .question-item { margin-bottom: 16px; page-break-inside: avoid; }
    .q-header { display: flex; align-items: baseline; }
    .q-no { font-weight: bold; margin-right: 8px; min-width: 20px; }
    .q-content { font-size: 15px; }
    
    .q-hints { margin-top: 8px; background: #fafafa; padding: 8px; border: 1px dashed #ccc; font-size: 12px; color: #555; }
    .hint-label { font-weight: bold; margin-bottom: 4px; }
    
    /* 留白区 */
    .with-workspace .q-workspace { height: 190px; border: 1px solid #eee; margin-top: 10px; padding: 8px; position: relative; }
    .workspace-label { color: #ccc; font-size: 12px; }
    .reflection { margin-top: 6px; font-size: 12px; color: #444; }
    .reflection-label { font-weight: bold; margin-bottom: 2px; }
    .reflection-boxes { color: #666; margin-bottom: 4px; }
    .reflection-line { color: #666; }
    
    .simple-workspace { height: 100px; border-bottom: 1px dashed #ccc; margin-top: 20px; margin-bottom: 20px; }
    .simple-reflection { margin-top: 8px; font-size: 12px; color: #666; }
    .simple-reflection-line { font-size: 12px; color: #666; margin-top: -8px; margin-bottom: 10px; }
    
    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
    
    @media print {
      body { margin: 0; padding: 20px; }
      .section h3 { background: none; border-left: 4px solid #000; }
      .q-hints { border: 1px dashed #999; }
    }
  </style>
</head>
<body>
  <h1>${studentInfo.subject}错题巩固本</h1>
  <div class="subtitle">—— 针对性强化训练 ——</div>
  
  <div class="student-info-bar">
    <span>姓名：${studentInfo.name}</span>
    <span>班级：${studentInfo.className}</span>
    <span>来源：${studentInfo.examName}</span>
    <span>生成日期：${new Date().toLocaleDateString()}</span>
  </div>
  
  ${diagnosisHtml}
  
  ${contentHtml}
  
  <div class="footer">
    Powered by 试卷分析助手 AI
  </div>
</body>
</html>`);
    doc.close();
    printWindow.focus();
    // Allow styles to load
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div className="report-layout" style={pageStyle}>
      <header className="home-header">
        <div className="header-top-row">
          <div className="app-title">试卷分析助手</div>
        </div>
        <div className="header-subtitle">
          {studentInfo.name} · {studentInfo.grade}({studentInfo.className}) · {studentInfo.subject} · 错题巩固本
        </div>
      </header>

      <div className="report-content">
        {/* 顶部模式切换栏 */}
        <div style={{ 
          display: 'flex', justifyContent: 'center', marginBottom: 24,
          background: '#fff', padding: 8, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', background: '#f5f5f5', borderRadius: 8, padding: 4 }}>
            <button
              onClick={() => setViewMode('print')}
              style={{
                padding: '8px 24px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: viewMode === 'print' ? '#fff' : 'transparent',
                color: viewMode === 'print' ? '#1a73e8' : '#666',
                fontWeight: viewMode === 'print' ? 'bold' : 'normal',
                boxShadow: viewMode === 'print' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              打印/训练模式
            </button>
            <button
              onClick={() => setViewMode('acceptance')}
              style={{
                padding: '8px 24px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: viewMode === 'acceptance' ? '#fff' : 'transparent',
                color: viewMode === 'acceptance' ? '#1a73e8' : '#666',
                fontWeight: viewMode === 'acceptance' ? 'bold' : 'normal',
                boxShadow: viewMode === 'acceptance' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              在线验收模式 (V4.1)
            </button>
          </div>
        </div>

        {viewMode === 'print' ? (
          <>
            {/* 打印模式工具栏 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div className="section-title" style={{marginBottom: 0}}>错题巩固本预览</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: 13, cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={printOptions.showDiagnosis}
                    onChange={e => setPrintOptions({...printOptions, showDiagnosis: e.target.checked})}
                    style={{ marginRight: 6 }}
                  />
                  包含错因诊断
                </label>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: 13, cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={printOptions.showHints}
                    onChange={e => setPrintOptions({...printOptions, showHints: e.target.checked})}
                    style={{ marginRight: 6 }}
                  />
                  包含思路提示
                </label>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: 13, cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={printOptions.addWorkspace}
                    onChange={e => setPrintOptions({...printOptions, addWorkspace: e.target.checked})}
                    style={{ marginRight: 6 }}
                  />
                  预留解题空间
                </label>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{fontSize: 13, color: '#666'}}>版式:</span>
                <select 
                  value={printOptions.layoutMode}
                  onChange={(e) => setPrintOptions({...printOptions, layoutMode: e.target.value as any})}
                  style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc', fontSize: 13 }}
                >
                  <option value="list">标准列表</option>
                  <option value="a4">A4 双栏 (省纸)</option>
                  <option value="card">错题卡 (单题)</option>
                </select>
              </div>
            </div>

            <section className="suggestions-card" style={{ minHeight: 400 }}>
              {/* 预览区域 */}
              <div style={{ 
                background: 'white', 
                border: '1px solid #e0e0e0', 
                padding: 40, 
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                transform: 'scale(0.95)',
                transformOrigin: 'top center'
              }}>
                <div style={{ textAlign: 'center', marginBottom: 20, borderBottom: '2px solid #333', paddingBottom: 10 }}>
                  <h2 style={{ margin: 0, fontSize: 24 }}>{studentInfo.subject}错题巩固本</h2>
                  <div style={{ marginTop: 8, color: '#666', fontSize: 14 }}>
                    姓名：{studentInfo.name} &nbsp;|&nbsp; 来源：{studentInfo.examName}
                  </div>
                </div>

                {printOptions.showDiagnosis && problems.length > 0 && (
                  <div style={{ marginBottom: 30 }}>
                    <h3 style={{ fontSize: 16, borderLeft: '4px solid #333', paddingLeft: 10, marginBottom: 16 }}>错题诊断摘要</h3>
                    {problems.map((p: any, i: number) => (
                      <div key={i} style={{ fontSize: 13, marginBottom: 8, color: '#555' }}>
                        <span style={{ fontWeight: 'bold' }}>{i + 1}. 【{p.name}】</span> {p.desc}
                      </div>
                    ))}
                  </div>
                )}

                {hasPaper ? (
                  <div className="practice-paper-view">
                    {practicePaper.sections.map((section: any, idx: number) => (
                      <div key={idx} id={`paper-sec-${idx}`} className="paper-section" style={{ marginBottom: 24 }}>
                        <div className="paper-section-title" style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>
                          <LatexRenderer text={section.name} />
                        </div>
                        <div className="paper-questions">
                          {section.questions.map((q: any, qIdx: number) => (
                            <div key={qIdx} className="paper-question-item" style={{ marginBottom: 20 }}>
                              <div className="pq-content" style={{ fontSize: 15, marginBottom: 8 }}>
                                <span style={{ fontWeight: 'bold', marginRight: 6 }}>{q.no}.</span>
                                <LatexRenderer text={String(q.content || '')} />
                              </div>
                              
                              {printOptions.showHints && Array.isArray(q.hints) && q.hints.length > 0 && (
                                <div style={{ background: '#f9f9f9', padding: 8, borderRadius: 4, fontSize: 12, color: '#666', marginBottom: 8 }}>
                                  <div style={{ fontWeight: 'bold', marginBottom: 4 }}>💡 思路点拨：</div>
                                  {q.hints.slice(0, 3).map((h: string, hi: number) => (
                                    <div key={hi}>
                                      • <LatexRenderer text={String(h || '')} />
                                    </div>
                                  ))}
                                </div>
                              )}

                              {printOptions.addWorkspace && (
                                <div style={{ height: 100, border: '1px solid #eee', borderRadius: 4, position: 'relative' }}>
                                  <span style={{ position: 'absolute', top: 4, left: 6, fontSize: 10, color: '#ccc' }}>解题区</span>
                                  <div style={{ position: 'absolute', left: 6, right: 6, bottom: 6, fontSize: 11, color: '#666' }}>
                                    <div style={{ fontWeight: 700, marginBottom: 4 }}>错因自查：</div>
                                    <div>□ 概念不清　□ 计算失误　□ 审题漏条件　□ 步骤不完整　□ 时间不够</div>
                                    <div style={{ marginTop: 6 }}>复盘一句话：________________________</div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : hasQuestions ? (
                  <ol className="suggestion-list">
                    {practiceQuestions.map((q, index) => (
                      <li key={index} style={{ marginBottom: 20 }}>
                        <div>
                          <LatexRenderer text={String(q || '')} />
                        </div>
                        {printOptions.addWorkspace && (
                          <>
                            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                              错因自查：□ 概念不清 □ 计算失误 □ 审题漏条件 □ 步骤不完整 □ 时间不够
                            </div>
                            <div style={{ height: 80, borderBottom: '1px dashed #eee', marginTop: 10 }}></div>
                            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>复盘一句话：________________________</div>
                          </>
                        )}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div style={{ fontSize: 14, color: '#666', lineHeight: 1.7, textAlign: 'center', padding: 40 }}>
                    暂无练习内容
                  </div>
                )}
              </div>
            </section>
          </>
        ) : (
          /* ------------------- 验收模式 (Acceptance View) ------------------- */
          <div className="acceptance-view" style={{ maxWidth: 800, margin: '0 auto' }}>
            {acceptanceState.submitted ? (
              <div style={{ textAlign: 'center', padding: 40, background: '#fff', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <CheckCircle size={64} color="#4CAF50" style={{ marginBottom: 16 }} />
                <h2 style={{ fontSize: 24, marginBottom: 8 }}>验收已完成</h2>
                <div style={{ fontSize: 16, color: '#666', marginBottom: 24 }}>
                  通过率: {Math.round((Object.values(acceptanceState.answers).filter(v => v === true).length / flatQuestions.length) * 100)}%
                </div>
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                    <div style={{ padding: '16px 24px', background: '#f5f5f5', borderRadius: 8 }}>
                        <div style={{ fontSize: 24, fontWeight: 'bold', color: '#4CAF50' }}>
                            {Object.values(acceptanceState.answers).filter(v => v === true).length}
                        </div>
                        <div style={{ fontSize: 12, color: '#666' }}>已掌握</div>
                    </div>
                    <div style={{ padding: '16px 24px', background: '#f5f5f5', borderRadius: 8 }}>
                        <div style={{ fontSize: 24, fontWeight: 'bold', color: '#F44336' }}>
                            {Object.values(acceptanceState.answers).filter(v => v !== true).length}
                        </div>
                        <div style={{ fontSize: 12, color: '#666' }}>需强化</div>
                    </div>
                </div>
                <div style={{ marginTop: 32 }}>
                    <button 
                        onClick={onBack}
                        style={{ padding: '10px 32px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 16 }}
                    >
                        返回主页
                    </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 16, background: '#E3F2FD', padding: 12, borderRadius: 8, color: '#1565C0', fontSize: 14, display: 'flex', alignItems: 'center' }}>
                    <HelpCircle size={16} style={{ marginRight: 8 }} />
                    说明：请在纸上独立完成以下题目，完成后自我核对。如需帮助可点击“查看提示”，但该题将标记为“需强化”。
                </div>

                {flatQuestions.map((q: any, i: number) => (
                  <div key={q.id || i} style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                      <div style={{ fontWeight: 'bold', fontSize: 16, color: '#333' }}>
                        第 {i + 1} 题
                        {q.sectionName && <span style={{ fontSize: 12, fontWeight: 'normal', color: '#999', marginLeft: 8 }}>({q.sectionName})</span>}
                      </div>
                      <div style={{ fontSize: 12, color: acceptanceState.answers[q.id] === true ? '#4CAF50' : acceptanceState.answers[q.id] === false ? '#F44336' : '#ccc' }}>
                        {acceptanceState.answers[q.id] === true ? '已标记：掌握' : acceptanceState.answers[q.id] === false ? '已标记：需强化' : '未标记'}
                      </div>
                    </div>

                    <div style={{ fontSize: 16, lineHeight: 1.6, marginBottom: 24 }}>
                      <LatexRenderer text={String(q.content || '')} />
                    </div>

                    {/* Hint Section */}
                    {q.hints && q.hints.length > 0 && (
                        <div style={{ marginBottom: 20 }}>
                            {!acceptanceState.hintsUsed[q.id] ? (
                                <button 
                                    onClick={() => handleToggleHint(q.id)}
                                    style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: '#1a73e8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                >
                                    <HelpCircle size={14} style={{ marginRight: 4 }} />
                                    查看思路提示 (将标记为需强化)
                                </button>
                            ) : (
                                <div style={{ background: '#FFF3E0', padding: 12, borderRadius: 6, border: '1px dashed #FFB74D' }}>
                                    <div style={{ fontSize: 12, fontWeight: 'bold', color: '#EF6C00', marginBottom: 4 }}>💡 思路点拨：</div>
                                    {q.hints.map((h: string, hi: number) => (
                                        <div key={hi} style={{ fontSize: 13, color: '#555', marginBottom: 2 }}>
                                          • <LatexRenderer text={String(h || '')} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: 12, borderTop: '1px solid #eee', paddingTop: 16 }}>
                        <button
                            onClick={() => handleAnswer(q.id, false)}
                            style={{ 
                                flex: 1, padding: '10px', borderRadius: 6, border: '1px solid #FFCDD2', 
                                background: acceptanceState.answers[q.id] === false ? '#FFEBEE' : '#fff',
                                color: '#D32F2F', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            <XCircle size={16} style={{ marginRight: 6 }} />
                            仍需练习
                        </button>
                        <button
                            onClick={() => handleAnswer(q.id, true)}
                            disabled={acceptanceState.hintsUsed[q.id]} // Disable pass if hint used? Or just warn? Let's disable for strictness or allow with warning. 
                            // White paper says: "Use hint -> Must re-test". So here we can just auto-fail or allow user to decide but visually indicate.
                            // Let's implement strict mode: Hint used = Cannot mark as "Perfect Pass" easily, or just rely on honor system but highlight it.
                            // For better UX, let's just allow clicking but maybe show a warning.
                            // Actually, let's keep it simple: Click hint -> Mark as used. User can still click Pass, but we know they used a hint.
                            style={{ 
                                flex: 1, padding: '10px', borderRadius: 6, border: '1px solid #C8E6C9', 
                                background: acceptanceState.answers[q.id] === true ? '#E8F5E9' : '#fff',
                                color: '#388E3C', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                opacity: acceptanceState.hintsUsed[q.id] ? 0.6 : 1
                            }}
                            title={acceptanceState.hintsUsed[q.id] ? "使用了提示，建议标记为需强化" : ""}
                        >
                            <CheckCircle size={16} style={{ marginRight: 6 }} />
                            {acceptanceState.hintsUsed[q.id] ? '勉强掌握' : '完全掌握'}
                        </button>
                    </div>
                  </div>
                ))}

                <div style={{ padding: '20px 0', textAlign: 'center' }}>
                    <button 
                        className="op-btn-primary" 
                        onClick={handleSubmitAcceptance}
                        style={{ width: '100%', maxWidth: 300, height: 48, fontSize: 16 }}
                    >
                        提交验收结果
                    </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="bottom-operation-bar">
        <button className="op-btn-secondary" onClick={onBack}>
          <Layout size={16} style={{ marginRight: 6 }}/>
          返回报告
        </button>
        {viewMode === 'print' && (
          <button
            className="op-btn-primary"
            onClick={handlePrintPractice}
            style={{ background: '#42A5F5', color: '#fff' }}
          >
            <Printer size={16} style={{ marginRight: 6 }}/>
            打印 / 导出 PDF
          </button>
        )}
      </div>
    </div>
  );
};
