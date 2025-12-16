import React from 'react';
import { Dashboard } from './Dashboard';

interface PrintLayoutProps {
  data: any;
}

export const PrintLayout: React.FC<PrintLayoutProps> = ({ data }) => {
  if (!data) return null;

  // Adapt to the data structure from Home.tsx
  const { studentInfo, summary, modules, typeAnalysis } = data;
  
  // Safe access helpers
  const totalScore = summary?.totalScore || 0;
  const fullScore = summary?.fullScore || 100;
  const scoreChange = summary?.scoreChange;
  const evaluation = modules?.evaluation || [];
  const problems = modules?.problems || [];
  const adviceContent = modules?.advice?.content || [];
  const adviceHabit = modules?.advice?.habit || [];

  return (
    <div className="print-layout">
      <div className="print-header">
        <h1>试卷分析报告</h1>
        <div className="student-info">
            <span>姓名：{studentInfo?.name || '---'}</span>
            <span>年级：{studentInfo?.grade || '---'}</span>
            <span>科目：{studentInfo?.subject || '---'}</span>
            <span>{studentInfo?.examName || '---'}</span>
        </div>
      </div>

      <div className="print-section">
        <h2>一、成绩概览</h2>
        <div className="print-dashboard-wrapper">
            <Dashboard 
                score={totalScore} 
                fullScore={fullScore} 
                typeAnalysis={typeAnalysis || []}
                classAverage={summary?.classAverage}
                scoreChange={scoreChange}
                summary={summary?.overview}
                showTypeAnalysis={true} // Print with charts
            />
        </div>
      </div>

      <div className="print-section">
        <h2>二、整体评价</h2>
        <div className="print-text">
            {Array.isArray(evaluation) ? (
                <ul className="print-list">
                    {evaluation.map((item: string, i: number) => <li key={i}>{item}</li>)}
                </ul>
            ) : (
                <p>{evaluation}</p>
            )}
        </div>
      </div>

      <div className="print-section">
        <h2>三、薄弱环节</h2>
        <ul className="print-list">
          {problems.map((item: any, i: number) => (
            <li key={i}>
                <strong>{item.name}</strong> (得分率: {item.rate}): {item.desc}
            </li>
          ))}
        </ul>
      </div>

      <div className="print-section">
        <h2>四、改进建议</h2>
        <div className="print-subsection">
            <h3>学习内容</h3>
            <ul className="print-list">
            {adviceContent.map((item: string, i: number) => (
                <li key={i}>{item}</li>
            ))}
            </ul>
        </div>
        {adviceHabit.length > 0 && (
            <div className="print-subsection" style={{marginTop: 10}}>
                <h3>习惯与方法</h3>
                <ul className="print-list">
                {adviceHabit.map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                ))}
                </ul>
            </div>
        )}
      </div>
      
      <div className="print-footer">
        <p>生成时间：{new Date().toLocaleDateString()}</p>
        <p>试卷分析助手 AI 生成</p>
      </div>
    </div>
  );
};
