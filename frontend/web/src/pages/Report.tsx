// =================================================================================
// 个人分析报告页 (Report) - 优化版 (Page 2)
// =================================================================================

import React, { useState } from 'react';
import { Settings, Download, ArrowLeft, Share2 } from 'lucide-react';
import { SettingsModal } from '../components/SettingsModal';
import { PrintLayout } from '../components/PrintLayout';
import { getAbilityInfoBySubject } from '../config/subjectConfig';

interface ReportProps {
  data: any;
  onBack?: () => void;
  onOpenPractice?: () => void;
}

export const Report: React.FC<ReportProps> = ({ data, onBack, onOpenPractice }) => {
  // 如果没有真实数据，使用默认结构防止崩溃，但尽量使用传入的 data
  // 假设 data 结构为 { studentInfo, summary, modules }
  const studentInfo = data?.studentInfo || {
    name: '张三', grade: '七年级', subject: '数学', className: '2班', examName: '期中考试'
  };

  const summary = data?.summary || {
    totalScore: 86,
    fullScore: 100,
    classAverage: 79,
    classRank: 8,
    totalStudents: 52,
    scoreChange: 6,
    overview: "成绩优良，比上次期中考试有所提升。"
  };

  const modules = data?.modules || {
    evaluation: [
        "基础知识掌握较扎实，多数选择题答题准确。",
        "总分高于班级平均分 7 分，处于中上水平。",
        "与上次期中考试相比，总分提升 6 分。"
    ],
    problems: [
        { name: "分式方程", rate: "55%", desc: "列方程步骤不完整，易漏写条件。" },
        { name: "一次函数图像", rate: "48%", desc: "读图不熟练，坐标易看错。" }
    ],
    keyErrors: [
        { no: "12", score: 8, point: "分式方程", type: "概念不清" },
        { no: "18", score: 10, point: "函数综合题", type: "解题不完整" }
    ],
    advice: {
        content: ["本周重点复习：分式方程、一元一次不等式。", "每天完成 3～5 道相关练习题。"],
      habit: ["解答题按‘审题→列式→计算→检查’四步书写完整。", "预留 5 分钟检查填空题。"]
    }
  };

  const typeAnalysis = data?.typeAnalysis || [];

  const getAbilityInfo = (type: string) => {
    return getAbilityInfoBySubject(type, studentInfo.subject);
  };

  const getPerformanceInfo = (score: number, full: number) => {
    if (!full || full <= 0) {
      return { rateText: '0%', label: '暂无数据', color: '#999', bg: '#f5f5f5' };
    }
    const rate = score / full;
    const percent = Math.round(rate * 100);
    const rateText = `${percent}%`;
    if (rate >= 0.85) {
      return { rateText, label: '优势板块', color: '#2E7D32', bg: '#E8F5E9' };
    }
    if (rate >= 0.6) {
      return { rateText, label: '基本稳定', color: '#0277BD', bg: '#E3F2FD' };
    }
    return { rateText, label: '需重点提升', color: '#C62828', bg: '#FFEBEE' };
  };

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false); // 预览弹窗状态
  const [toastMsg, setToastMsg] = useState<string | null>(null); // Toast 状态
  // 仅用于 SettingsModal 兼容
  const [llmConfig, setLlmConfig] = useState({ provider: 'doubao', apiKey: '', modelId: '' });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const practiceQuestions: string[] = data?.practiceQuestions || [];

  const handleShare = () => {
    const url = window.location.href;
    const nav: any = navigator;
    if (nav.share) {
      nav
        .share({
          title: '试卷分析报告',
          text: `${studentInfo.name}的${studentInfo.subject}分析报告`,
          url
        })
        .catch(() => {});
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => {
          showToast('已复制链接，可在微信/QQ 中粘贴发送');
        })
        .catch(() => {
          showToast('复制失败，请手动长按地址栏复制链接');
        });
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
      showToast('已复制链接，可在微信/QQ 中粘贴发送');
    } catch {
      showToast('当前环境不支持直接分享，请使用截图或导出 PDF');
    }
    document.body.removeChild(textarea);
  };

  return (
    <div className="report-layout">
      
      {/* 1. 顶部栏 (与首页保持一致) */}
      <header className="home-header">
        <div className="header-top-row">
            <div className="app-title">试卷分析助手</div>
            <button className="settings-btn" onClick={() => setIsSettingsOpen(true)}>
              <Settings size={20} color="#333" />
            </button>
        </div>
        <div className="header-subtitle">
            {studentInfo.name} · {studentInfo.grade}({studentInfo.className}) · {studentInfo.subject} · {studentInfo.examName}
        </div>
      </header>

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        studentInfo={studentInfo}
        onUpdateStudentInfo={() => {}} // 报告页暂不支持修改学生信息，或者可以支持
        llmConfig={llmConfig}
        onUpdateLlmConfig={setLlmConfig}
      />

      <div className="report-content">
          
          {/* 2. 成绩摘要卡片 */}
          <div className="score-summary-card">
              <div className="score-main">
                  {summary.totalScore}
                  <span className="score-full"> /{summary.fullScore}</span>
              </div>
              
              <div className="score-stats-row">
                  <div className="stat-item">
                      <span className="stat-label">班级均分</span>
                      <span className="stat-value">{summary.classAverage}</span>
                  </div>
                  <div className="stat-item">
                      <span className="stat-label">班级排名</span>
                      <span className="stat-value">{summary.classRank} / {summary.totalStudents}</span>
                  </div>
                  <div className="stat-item">
                      <span className="stat-label">较上次</span>
                      <span className="stat-value" style={{color: summary.scoreChange >= 0 ? '#66BB6A' : '#FF7043'}}>
                          {summary.scoreChange >= 0 ? `+${summary.scoreChange}` : summary.scoreChange}
                      </span>
                  </div>
              </div>

              <div className="score-eval-text">
                  {summary.overview}
              </div>
          </div>

          {/* 3. 模块一：整体评价 */}
          <div className="section-title">一、整体评价</div>
          <section className="suggestions-card">
             <ul className="suggestion-list">
               {modules.evaluation.map((item: string, i: number) => (
                 <li key={i}>{item}</li>
               ))}
             </ul>
          </section>

          {Array.isArray(typeAnalysis) && typeAnalysis.length > 0 && (
            <>
              <div className="section-title">题型与能力分析</div>
              <section className="suggestions-card">
                {typeAnalysis.map((item: any, index: number) => {
                  const abilityInfo = getAbilityInfo(item.type);
                  const performance = getPerformanceInfo(item.score, item.full);
                  const isLast = index === typeAnalysis.length - 1;
                  return (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '10px 8px',
                        borderBottom: isLast ? 'none' : '1px dashed #eee'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 6
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>{item.type}</span>
                          <span
                            style={{
                              fontSize: 11,
                              padding: '2px 8px',
                              borderRadius: 10,
                              background: '#fff8e1',
                              color: '#ff8f00',
                              border: '1px solid #ffe082'
                            }}
                          >
                            主要考察：{abilityInfo.ability}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 10,
                            background: performance.bg,
                            color: performance.color,
                            fontWeight: 600
                          }}
                        >
                          得分率 {performance.rateText} · {performance.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#666', lineHeight: 1.6 }}>
                        {abilityInfo.desc}
                      </div>
                      <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                        本次该题型得分 {item.score}/{item.full} 分。
                      </div>
                    </div>
                  );
                })}
              </section>
            </>
          )}

          {/* 4. 模块二：主要问题 */}
          <div className="section-title">二、主要问题</div>
          <section className="suggestions-card">
            <div className="suggestion-header">
                <span className="suggestion-tag">薄弱知识点</span>
            </div>
            <div style={{display: 'flex', flexDirection: 'column'}}>
                {modules.problems.map((item: any, i: number) => (
                    <div key={i} className="knowledge-item">
                        <div>
                            <span className="k-name">{item.name}</span>
                            <span className="k-rate">得分率 {item.rate}</span>
                            <div className="k-desc">{item.desc}</div>
                        </div>
                    </div>
                ))}
            </div>
            {/* 能力不足部分暂略，或者合并显示 */}
          </section>

          {/* 5. 模块三：关键错题 */}
          <div className="section-title">三、关键错题</div>
          <section className="suggestions-card">
             {modules.keyErrors.map((err: any, i: number) => (
                 <div key={i} className="error-item">
                     <div className="error-header">
                         <span className="error-title">第 {err.no} 题 ({err.score}分)</span>
                         <span className="error-tag">{err.type}</span>
                     </div>
                     <div className="error-point">知识点：{err.point}</div>
                 </div>
             ))}
          </section>

          {/* 6. 模块四：结论与建议 */}
          <div className="section-title">四、结论与建议</div>
          <section className="suggestions-card">
              <div className="advice-group-title">学习内容建议</div>
              <ul className="suggestion-list">
                  {modules.advice.content.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                  ))}
              </ul>
              
              <div className="advice-group-title" style={{marginTop: 16}}>习惯与方法</div>
              <ul className="suggestion-list">
                  {modules.advice.habit.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                  ))}
              </ul>
          </section>
          
          <div
            className="section-title"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span>五、巩固练习</span>
            {onOpenPractice && (
              <button
                className="secondary-btn"
                style={{ padding: '3px 10px', fontSize: 12 }}
                onClick={onOpenPractice}
              >
                生成练习卷
              </button>
            )}
          </div>
          <section className="suggestions-card">
            {practiceQuestions && practiceQuestions.length > 0 ? (
              <ul className="suggestion-list">
                {practiceQuestions.map((q, index) => (
                  <li key={index}>{q}</li>
                ))}
              </ul>
            ) : (
              <div style={{ fontSize: 14, color: '#666', lineHeight: 1.7, padding: '10px 0' }}>
                当前分析未生成具体的练习题。
                <br/>
                您可以点击右上角“生成练习卷”，在练习卷页面尝试自动补充题目。
              </div>
            )}
          </section>

          <div style={{height: 40}}></div>
      </div>
      
      {/* 7. 底部操作区 */}
      <div className="bottom-operation-bar">
        <button className="op-btn-secondary" onClick={onBack}>
            <ArrowLeft size={16} style={{ marginRight: 6, verticalAlign: 'middle' }}/>
            返回概览
        </button>
        <button className="op-btn-primary" style={{ background: '#66BB6A', color: 'white', boxShadow: '0 4px 12px rgba(102, 187, 106, 0.4)' }} onClick={() => setIsPreviewOpen(true)}>
            <Download size={16} style={{ marginRight: 6, verticalAlign: 'middle' }}/>
            导出个人报告
        </button>
      </div>

      {/* 8. 预览模态框 */}
      {isPreviewOpen && (
        <div className="settings-overlay" style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 200,
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center'
        }}>
            <div className="preview-modal" style={{
                width: '90%', height: '90%', 
                background: 'white', borderRadius: 12,
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
            }}>
                <div style={{
                    padding: '16px', borderBottom: '1px solid #eee',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <h3 style={{margin: 0, fontSize: 18}}>打印预览</h3>
                    <div style={{display: 'flex', gap: '10px'}}>
                        <button onClick={handleShare} style={{
                            border: 'none', background: 'transparent', fontSize: 14, color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center'
                        }}>
                           <Share2 size={18} style={{marginRight: 4}}/> 分享/复制链接
                        </button>
                        <button onClick={() => setIsPreviewOpen(false)} style={{
                            border: 'none', background: 'transparent', fontSize: 24, color: '#999', cursor: 'pointer'
                        }}>×</button>
                    </div>
                </div>
                
                {/* Toast Notification */}
                {toastMsg && (
                    <div style={{
                        position: 'absolute', 
                        top: '60px', 
                        left: '50%', 
                        transform: 'translateX(-50%)',
                        background: 'rgba(0,0,0,0.8)', 
                        color: 'white', 
                        padding: '8px 16px', 
                        borderRadius: 20, 
                        zIndex: 300,
                        fontSize: 14,
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap'
                    }}>
                        {toastMsg}
                    </div>
                )}
                
                {/* 预览内容区域 (Scrollable) */}
                <div style={{flex: 1, overflowY: 'auto', padding: '20px', background: '#f5f5f5'}}>
                    <div style={{
                        background: 'white', padding: '40px', 
                        maxWidth: '800px', margin: '0 auto',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                        {/* 强制显示 PrintLayout 的内容 */}
                        <div className="force-print-display">
                            <PrintLayout data={data || { studentInfo, summary, modules }} />
                        </div>
                    </div>
                </div>

                <div style={{
                    padding: '16px', borderTop: '1px solid #eee',
                    display: 'flex', justifyContent: 'flex-end', gap: '12px'
                }}>
                    <button className="op-btn-secondary" onClick={() => setIsPreviewOpen(false)} style={{width: 'auto', padding: '0 20px'}}>
                        取消
                    </button>
                    <button className="op-btn-primary" onClick={() => window.print()} style={{width: 'auto', padding: '0 20px'}}>
                        确认打印 / 保存 PDF
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Print Layout (Hidden on screen normally, but used for actual printing) */}
      <PrintLayout data={data || { studentInfo, summary, modules }} />
    </div>
  );
};
