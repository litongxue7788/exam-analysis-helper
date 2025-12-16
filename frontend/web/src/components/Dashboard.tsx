// =================================================================================
// 仪表盘组件 (Dashboard)
// =================================================================================

import React from 'react';

interface DashboardProps {
  score: number;
  fullScore: number;
  typeAnalysis: { type: string; score: number; full: number }[];
  classAverage?: number;
  scoreChange?: number; // Added for self-comparison
  strongestKnowledge?: string;
  weakestKnowledge?: string;
  summary?: string;
  showTypeAnalysis?: boolean; // Control whether to show the bar chart
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  score, 
  fullScore, 
  typeAnalysis,
  classAverage,
  scoreChange,
  strongestKnowledge,
  weakestKnowledge,
  summary,
  showTypeAnalysis = true
}) => {
  // 题型颜色映射
  const getTypeColor = (type: string, index: number) => {
    // 预设一套配色方案
    const colors = [
      '#FF7043', // 暖红
      '#42A5F5', // 蓝色
      '#66BB6A', // 绿色
      '#AB47BC', // 紫色
      '#FFA726', // 橙色
      '#26C6DA'  // 青色
    ];
    
    // 如果是特定的类型，可以固定颜色 (可选)
    const typeMap: Record<string, string> = {
      '计算': '#FF7043',
      '填空': '#42A5F5',
      '应用': '#66BB6A',
      '几何': '#AB47BC'
    };

    return typeMap[type] || colors[index % colors.length];
  };

  // 计算环形图的渐变段
  // 目标格式: conic-gradient(Color1 0% 10%, Color2 10% 30%, ..., #f0f0f0 30% 100%)
  const generateConicGradient = () => {
    // 1. 如果没有题型数据，根据分数段显示单色
    if (!typeAnalysis || typeAnalysis.length === 0) {
        if (score >= fullScore * 0.9) return '#66BB6A'; // 优秀 - 绿
        if (score >= fullScore * 0.75) return '#42A5F5'; // 良好 - 蓝
        if (score >= fullScore * 0.6) return '#FFA726'; // 及格 - 橙
        return '#FF7043'; // 不及格 - 红
    }

    // 2. 如果有题型数据，显示每部分的占比
    let gradientParts = [];
    let currentPercentage = 0;
    
    // 修改逻辑：饼图反映“试卷结构组成”（各题型满分占比）
    // 这样能直观展示“试卷组成部分及其名称”
    const totalFullScore = fullScore > 0 ? fullScore : 100;

    typeAnalysis.forEach((item, index) => {
        // 使用满分占比
        const segmentPercent = (item.full / totalFullScore) * 100;
        const color = getTypeColor(item.type, index);
        
        const start = currentPercentage;
        const end = currentPercentage + segmentPercent;
        
        gradientParts.push(`${color} ${start}% ${end}%`);
        currentPercentage = end;
    });

    // 补齐微小差距
    if (currentPercentage < 100) {
         gradientParts.push(`${getTypeColor(typeAnalysis[typeAnalysis.length-1].type, typeAnalysis.length-1)} ${currentPercentage}% 100%`);
    }

    return `conic-gradient(${gradientParts.join(', ')})`;
  };
  
  // 环形图样式
  const circleStyle = {
    background: generateConicGradient()
  };

  // Helper to ensure typeAnalysis is valid for rendering
  const hasTypeAnalysis = typeAnalysis && typeAnalysis.length > 0;
  const totalFullScore = fullScore > 0 ? fullScore : 100;

  return (
    <div className="dashboard-card">
      <div className="dashboard-content" style={{ flexDirection: 'column', gap: 16 }}>
        {/* 上半部分：图表区 (圆环 + 柱状图) */}
        <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 24 }}>
            {/* 左侧：试卷结构环形图 */}
            <div className="score-circle-wrapper">
            <div className="score-circle" style={circleStyle}>
                <div className="score-inner">
                <span className="score-num">{score}</span>
                <span className="score-total">/{fullScore}</span>
                <div style={{fontSize: 10, color: '#999', marginTop: 4}}>总得分</div>
                </div>
            </div>
            <div className="score-label">试卷结构与得分</div>
            </div>

            {/* 右侧：题型分布与得分详情 */}
            <div className="type-bars" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1 }}>
                {hasTypeAnalysis ? (
                    typeAnalysis.map((item, index) => {
                        // 1. 权重占比 (试卷结构)
                        const weightPercent = Math.round((item.full / totalFullScore) * 100);
                        // 2. 得分率 (学生表现)
                        const scorePercent = Math.round((item.score / item.full) * 100);
                        const barColor = getTypeColor(item.type, index);
                        
                        return (
                            <div key={index} className="bar-row" style={{ marginBottom: 10 }}>
                                {/* Label & Weight */}
                                <div style={{display: 'flex', alignItems: 'center', width: 90, flexShrink: 0}}>
                                    <span 
                                        style={{
                                            display: 'inline-block',
                                            width: 8,
                                            height: 8,
                                            borderRadius: '50%',
                                            backgroundColor: barColor,
                                            marginRight: 6
                                        }}
                                    />
                                    <div style={{display: 'flex', flexDirection: 'column'}}>
                                        <span className="bar-label" style={{ width: 'auto', lineHeight: 1.2, fontWeight: 600, color: '#444' }}>{item.type}</span>
                                        <span style={{fontSize: 10, color: '#999', marginTop: 1}}>占比{weightPercent}%</span>
                                    </div>
                                </div>

                                {/* Score Bar */}
                                <div className="bar-track" style={{flex: 1, margin: '0 12px', height: 8, backgroundColor: '#f5f5f5'}}>
                                    <div 
                                        className="bar-fill" 
                                        style={{ width: `${scorePercent}%`, backgroundColor: barColor, borderRadius: 4 }} 
                                    />
                                </div>
                                
                                {/* Score Value */}
                                <span className="bar-value" style={{width: 55, textAlign: 'right'}}>
                                    <span style={{fontSize: 14, fontWeight: 'bold', color: '#333'}}>{item.score}</span>
                                    <span style={{fontSize: 11, color: '#999'}}>/{item.full}</span>
                                </span>
                            </div>
                        );
                    })
                ) : (
                    <div style={{fontSize: 12, color: '#999', textAlign: 'center', padding: '10px 0'}}>
                        暂无题型结构数据
                    </div>
                )}
            </div>
        </div>

        {/* 下半部分：概览信息 (比较、标签、总结) */}
        {(scoreChange !== undefined || classAverage !== undefined || strongestKnowledge || summary) && (
            <div className="dashboard-overview-info" style={{ 
                borderTop: '1px dashed #eee', 
                paddingTop: 16, 
                paddingLeft: 0,
                marginTop: 4 
            }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', marginBottom: summary ? 12 : 0 }}>
                    {/* 分数变化 */}
                    {scoreChange !== undefined && (
                        <div style={{ 
                            fontSize: 13, 
                            display: 'flex', 
                            alignItems: 'center',
                            background: scoreChange >= 0 ? '#E8F5E9' : '#FFEBEE',
                            padding: '4px 10px',
                            borderRadius: 12,
                            color: scoreChange >= 0 ? '#2E7D32' : '#C62828'
                        }}>
                            <span style={{ marginRight: 4 }}>较上次</span>
                            <span style={{ fontWeight: 'bold' }}>
                                {scoreChange > 0 ? `进步 ${scoreChange} 分` : scoreChange < 0 ? `退步 ${Math.abs(scoreChange)} 分` : '持平'}
                            </span>
                        </div>
                    )}

                    {/* 优势/薄弱知识点 */}
                    {strongestKnowledge && (
                        <div style={{ fontSize: 12, color: '#555', display: 'flex', alignItems: 'center' }}>
                            <span style={{ 
                                width: 6, height: 6, borderRadius: '50%', background: '#66BB6A', marginRight: 6 
                            }}></span>
                            优势：{strongestKnowledge}
                        </div>
                    )}
                    {weakestKnowledge && (
                        <div style={{ fontSize: 12, color: '#555', display: 'flex', alignItems: 'center' }}>
                            <span style={{ 
                                width: 6, height: 6, borderRadius: '50%', background: '#FF7043', marginRight: 6 
                            }}></span>
                            薄弱：{weakestKnowledge}
                        </div>
                    )}
                </div>

                {/* 总结文本 */}
                {summary && (
                    <div className="dashboard-summary-box" style={{ 
                        marginTop: 12, 
                        fontSize: 13, 
                        color: '#666', 
                        lineHeight: 1.6,
                        background: '#fafafa',
                        padding: 12,
                        borderRadius: 8
                    }}>
                        {summary}
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};
