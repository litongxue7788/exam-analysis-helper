import React from 'react';

interface PracticeSheetProps {
  data: any;
  onBack?: () => void;
}

export const PracticeSheet: React.FC<PracticeSheetProps> = ({ data, onBack }) => {
  const studentInfo = data?.studentInfo || {
    name: '张三',
    grade: '七年级',
    subject: '数学',
    className: '2班',
    examName: '巩固练习卷'
  };

  const practicePaper = data?.practicePaper;
  const practiceQuestions: string[] = data?.practiceQuestions || [];
  
  // 判断是否有结构化试卷或简单题目列表
  const hasPaper = !!(practicePaper && practicePaper.sections && practicePaper.sections.length > 0);
  const hasQuestions = practiceQuestions && practiceQuestions.length > 0;
  const hasContent = hasPaper || hasQuestions;

  const handlePrintPractice = () => {
    if (!hasContent) {
      window.print();
      return;
    }

    const title = `${studentInfo.name}-${studentInfo.subject}-巩固练习卷`;
    let contentHtml = '';

    if (hasPaper) {
      contentHtml = practicePaper.sections.map((section: any) => `
        <div class="section">
          <h3>${section.name}</h3>
          <div class="questions">
            ${section.questions.map((q: any) => `
              <div class="question-item">
                <div class="q-content">${q.content}</div>
                ${q.answer ? `<div class="q-answer" style="display:none;">参考答案：${q.answer}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `).join('');
    } else {
      contentHtml = `<ol>${practiceQuestions.map((q, index) => `<li>${index + 1}、${q}</li>`).join('')}</ol>`;
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
    body { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; margin: 40px; color: #333; }
    h1 { text-align: center; font-size: 24px; margin-bottom: 16px; }
    .student-info { text-align: center; font-size: 14px; margin-bottom: 24px; border-bottom: 1px solid #eee; padding-bottom: 16px; }
    
    /* 结构化试卷样式 */
    .section { margin-bottom: 24px; }
    .section h3 { font-size: 16px; font-weight: bold; margin-bottom: 12px; border-left: 4px solid #333; padding-left: 8px; }
    .question-item { margin-bottom: 16px; page-break-inside: avoid; }
    .q-content { font-size: 14px; line-height: 1.6; white-space: pre-wrap; }
    
    /* 简单列表样式 */
    ol { padding-left: 22px; font-size: 14px; line-height: 1.8; }
    li { margin-bottom: 10px; }
    
    .footer { margin-top: 40px; text-align: right; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 10px; }
  </style>
</head>
<body>
  <h1>巩固练习卷</h1>
  <div class="student-info">
    姓名：${studentInfo.name}　　年级：${studentInfo.grade}（${studentInfo.className}）　　学科：${studentInfo.subject}<br/>
    来源考试：${studentInfo.examName || '本次考试'}
  </div>
  
  ${contentHtml}
  
  <div class="footer">
    生成时间：${new Date().toLocaleDateString()}
  </div>
</body>
</html>`);
    doc.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="report-layout">
      <header className="home-header">
        <div className="header-top-row">
          <div className="app-title">试卷分析助手</div>
        </div>
        <div className="header-subtitle">
          {studentInfo.name} · {studentInfo.grade}({studentInfo.className}) · {studentInfo.subject} · 练习卷
        </div>
      </header>

      <div className="report-content">
        <div className="section-title">巩固练习卷</div>
        <section className="suggestions-card">
          {hasPaper ? (
            <div className="practice-paper-view">
              {practicePaper.sections.map((section: any, idx: number) => (
                <div key={idx} className="paper-section">
                  <div className="paper-section-title">{section.name}</div>
                  <div className="paper-questions">
                    {section.questions.map((q: any, qIdx: number) => (
                      <div key={qIdx} className="paper-question-item">
                        <div className="pq-content">{q.content}</div>
                        {/* 暂时隐藏答案，仅打印版可选显示 */}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : hasQuestions ? (
            <ol className="suggestion-list">
              {practiceQuestions.map((q, index) => (
                <li key={index}>{q}</li>
              ))}
            </ol>
          ) : (
            <div style={{ fontSize: 14, color: '#666', lineHeight: 1.7 }}>
              当前分析结果暂未生成练习题。
              建议先完成一次试卷分析，并确保报告中已经出现“巩固练习”内容后再打开本页面。
            </div>
          )}
        </section>
      </div>

      <div className="bottom-operation-bar">
        <button className="op-btn-secondary" onClick={onBack}>
          返回报告
        </button>
        <button
          className="op-btn-primary"
          onClick={handlePrintPractice}
          style={{ background: '#42A5F5', color: '#fff' }}
        >
          打印 / 保存练习卷
        </button>
      </div>
    </div>
  );
};
