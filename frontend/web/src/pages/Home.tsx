// =================================================================================
// 首页组件 (Home) - 优化版 (Page 1)
// =================================================================================

import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Settings, Image as ImageIcon, Camera, FileSpreadsheet, ChevronRight, RefreshCw } from 'lucide-react';
import { AnalyzeExamRequest, AnalyzeExamResponse } from '../types/api';
import { SettingsModal } from '../components/SettingsModal';
import { Dashboard } from '../components/Dashboard';

interface HomeProps {
  onAnalyzeComplete: (result: any) => void;
  initialData?: any;
  history?: any[];
  onSwitchExam?: (index: number) => void;
}

export const Home: React.FC<HomeProps> = ({ onAnalyzeComplete, initialData, history = [], onSwitchExam }) => {
  // --- 状态管理 ---
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false); // 历史记录弹窗状态
  const [isTrendsOpen, setIsTrendsOpen] = useState(false); // 趋势分析弹窗状态

  // 学生信息 (优先从 LocalStorage 读取，如果 props.initialData 变化则更新)
  const [studentInfo, setStudentInfo] = useState(() => {
    const saved = localStorage.getItem('studentInfo');
    return saved ? JSON.parse(saved) : (initialData?.studentInfo || {
      name: '张三',
      grade: '七年级',
      subject: '数学',
      className: '2班',
      examName: '期中考试',
      examTime: new Date().toISOString().split('T')[0]
    });
  });

  // 大模型配置
  const [llmConfig, setLlmConfig] = useState(() => {
    const saved = localStorage.getItem('llmConfig');
    return saved ? JSON.parse(saved) : {
      provider: 'doubao',
      apiKey: '',
      modelId: ''
    };
  });

  // 仪表盘数据
  const [dashboardData, setDashboardData] = useState<{
    score: number;
    fullScore: number;
    typeAnalysis: { type: string; score: number; full: number }[];
    classAverage?: number;
    scoreChange?: number; // Added
    strongestKnowledge?: string;
    weakestKnowledge?: string;
    summary?: string;
    suggestions?: string[];
    paperAppearance?: { rating: string; content: string };
  } | null>(() => {
    // 优先使用 initialData (如果是从历史记录切换过来的)
    if (initialData && initialData.summary) {
       return {
         score: initialData.summary.totalScore,
         fullScore: initialData.summary.fullScore || 100,
         typeAnalysis: initialData.typeAnalysis || [],
         classAverage: initialData.summary.classAverage,
         scoreChange: initialData.summary.scoreChange, // Restore from history
         strongestKnowledge: initialData.summary.strongestKnowledge, // 需要确保保存时有这个字段
         weakestKnowledge: initialData.summary.weakestKnowledge,
         summary: initialData.summary.overview,
       };
    }
    const saved = localStorage.getItem('dashboardData');
    return saved ? JSON.parse(saved) : null;
  });

  // --- 监听 initialData 变化 (用于切换考试) ---
  React.useEffect(() => {
    if (initialData) {
      if (initialData.studentInfo) {
        setStudentInfo(initialData.studentInfo);
      }
      
      if (initialData.summary) {
        setDashboardData({
          score: initialData.summary.totalScore,
          fullScore: initialData.summary.fullScore || 100,
          typeAnalysis: initialData.typeAnalysis || [],
          classAverage: initialData.summary.classAverage,
          scoreChange: initialData.summary.scoreChange,
          strongestKnowledge: initialData.summary.strongestKnowledge,
          weakestKnowledge: initialData.summary.weakestKnowledge,
          summary: initialData.summary.overview,
          // 兼容旧字段
          suggestions: initialData.modules?.advice?.content || [],
        });
      }
    }
  }, [initialData]);

  // --- 持久化 Effects ---
  React.useEffect(() => {
    localStorage.setItem('studentInfo', JSON.stringify(studentInfo));
  }, [studentInfo]);

  React.useEffect(() => {
    localStorage.setItem('llmConfig', JSON.stringify(llmConfig));
  }, [llmConfig]);

  React.useEffect(() => {
    if (dashboardData) {
      localStorage.setItem('dashboardData', JSON.stringify(dashboardData));
    }
  }, [dashboardData]);

  const trendData = React.useMemo(() => {
    const validExams = history
      .filter((exam) => {
        if (!exam) return false;
        const summaryScore =
          exam.summary?.totalScore ??
          exam.score?.totalScore ??
          exam.totalScore ??
          exam.score;
        return typeof summaryScore === 'number' && !isNaN(summaryScore);
      })
      .slice()
      .reverse();

    if (validExams.length === 0) {
      return {
        exams: [] as any[],
        scores: [] as number[],
        labels: [] as string[],
        maxScore: 0,
        avgScore: 0,
        improvement: 0,
        chartPoints: '' as string,
        pointPositions: [] as { x: number; y: number }[],
        topStrongest: '',
        topWeakest: '',
        latestStrongest: '',
        latestWeakest: '',
      };
    }

    const limitedExams = validExams.slice(-5);

    const scores = limitedExams.map((exam) => {
      const summaryScore =
        exam.summary?.totalScore ??
        exam.score?.totalScore ??
        exam.totalScore ??
        exam.score;
      return typeof summaryScore === 'number' ? summaryScore : 0;
    });

    const fullScores = limitedExams.map((exam) => {
      const full =
        exam.summary?.fullScore ??
        exam.fullScore ??
        exam.score?.fullScore;
      return typeof full === 'number' && full > 0 ? full : 100;
    });

    const labels = limitedExams.map((exam, index) => {
      const name = exam.studentInfo?.examName || exam.examName;
      const time = exam.timestamp || exam.studentInfo?.examTime;
      const dateStr = time ? new Date(time).toLocaleDateString() : '';
      if (name && dateStr) return `${name.replace(/\s+/g, '')}\n${dateStr}`;
      if (name) return name.replace(/\s+/g, '');
      return `第${index + 1}次`;
    });

    const maxScore = Math.max(...fullScores, 100);
    const avgScore =
      scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const improvement = scores[scores.length - 1] - scores[0];

    const chartWidth = 300;
    const chartHeight = 150;
    const paddingX = 20;
    const paddingTop = 20;
    const paddingBottom = 20;
    const usableHeight = chartHeight - paddingTop - paddingBottom;
    const step =
      scores.length > 1
        ? (chartWidth - paddingX * 2) / (scores.length - 1)
        : 0;

    const pointPositions = scores.map((score, index) => {
      const x = paddingX + step * index;
      const ratio = Math.max(
        0,
        Math.min(1, score / maxScore)
      );
      const y = paddingTop + (1 - ratio) * usableHeight;
      return { x, y };
    });

    const chartPoints = pointPositions
      .map((p) => `${p.x},${p.y}`)
      .join(' ');

    const strongestCount: Record<string, number> = {};
    const weakestCount: Record<string, number> = {};

    limitedExams.forEach((exam) => {
      const strongest =
        exam.summary?.strongestKnowledge ??
        exam.strongestKnowledge;
      const weakest =
        exam.summary?.weakestKnowledge ??
        exam.weakestKnowledge;
      if (strongest && typeof strongest === 'string') {
        strongestCount[strongest] =
          (strongestCount[strongest] || 0) + 1;
      }
      if (weakest && typeof weakest === 'string') {
        weakestCount[weakest] = (weakestCount[weakest] || 0) + 1;
      }
    });

    const sortEntries = (obj: Record<string, number>) =>
      Object.entries(obj).sort((a, b) => b[1] - a[1]);

    const topStrongestEntry = sortEntries(strongestCount)[0];
    const topWeakestEntry = sortEntries(weakestCount)[0];

    const latestExam = limitedExams[limitedExams.length - 1];
    const latestStrongest =
      latestExam.summary?.strongestKnowledge ??
      latestExam.strongestKnowledge ??
      '';
    const latestWeakest =
      latestExam.summary?.weakestKnowledge ??
      latestExam.weakestKnowledge ??
      '';

    return {
      exams: limitedExams,
      scores,
      labels,
      maxScore,
      avgScore,
      improvement,
      chartPoints,
      pointPositions,
      topStrongest: topStrongestEntry ? topStrongestEntry[0] : '',
      topWeakest: topWeakestEntry ? topWeakestEntry[0] : '',
      latestStrongest,
      latestWeakest,
    };
  }, [history]);

  // Input refs for different entry types
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // --- 事件处理 ---

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'excel') => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      const newFiles = [...files, ...selectedFiles];
      setFiles(newFiles);
      
      // 如果是Excel，尝试预解析以显示概览
      if (type === 'excel' && selectedFiles[0].name.endsWith('.csv')) {
        parsePreview(selectedFiles[0]);
      }
    }
  };

  // 预解析 CSV 用于显示仪表盘预览 (模拟概览数据)
  const parsePreview = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as any[];
        const row = rows.find((r: any) => r['学生姓名'] === studentInfo.name);
        if (row) {
          setDashboardData({
            score: Number(row['总分']),
            fullScore: 100,
            typeAnalysis: [
              { type: '选择题', score: 30, full: 40 },
              { type: '填空题', score: 18, full: 20 },
              { type: '解答题', score: 38, full: 40 }
            ],
            classAverage: 79, // 模拟班级平均分
            scoreChange: 5, // Mock: Improved by 5 points
            strongestKnowledge: '代数运算',
            weakestKnowledge: '分式方程',
            summary: '整体成绩处于班级中上水平，客观题表现较好，解答题得分偏低。',
          });
        }
      }
    });
  };

  // 辅助：文件转 Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // 执行分析并跳转 (生成个人分析报告)
  const handleGenerateReport = async () => {
    if (files.length === 0 && !dashboardData) {
      alert('请先录入数据（拍照或导入表格）！');
      return;
    }

    setLoading(true);

    try {
      // 场景 1: 如果有上传的图片，优先使用图片分析 API
      if (files.filter(f => f.type.startsWith('image')).length > 0) {
        // 1. 转 Base64
        const imageFiles = files.filter(f => f.type.startsWith('image'));
        const base64Images = await Promise.all(imageFiles.map(f => fileToBase64(f)));
        
        // 2. 调用后端 API
        // 注意：这里需要确保 llmConfig 已经有值，或者让后端使用默认值
        const payload = {
          images: base64Images,
          config: {
            provider: llmConfig.provider,
            apiKey: llmConfig.apiKey,
            modelId: llmConfig.modelId
          }
        };

        const response = await fetch('/api/analyze-images', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

        const result: AnalyzeExamResponse = await response.json();
        
        if (result.success && result.data) {
          const typeAnalysis = result.data.typeAnalysis || [];
          const inferredFullScore = typeAnalysis.length > 0
            ? typeAnalysis.reduce((sum, item) => sum + (item.full || 0), 0)
            : 100;
          const mergedStudentInfo = {
            ...studentInfo,
            examName: result.data.examName || studentInfo.examName
          };

          const summaryData = {
            totalScore: result.data.summary.totalScore,
            fullScore: inferredFullScore,
            classAverage: 79,
            classRank: result.data.summary.rank,
            totalStudents: 50,
            scoreChange: 0,
            overview: result.data.report.forStudent.overall,
            strongestKnowledge: result.data.summary.strongestKnowledge,
            weakestKnowledge: result.data.summary.weakestKnowledge
          };

          const reportData = {
            studentInfo: mergedStudentInfo,
            summary: summaryData,
            typeAnalysis,
            modules: {
              evaluation: [
                result.data.report.forStudent.overall,
                ...result.data.report.forStudent.problems.slice(0, 1)
              ],
              problems: result.data.report.forStudent.problems.map(p => ({
                name: "知识点待提取",
                rate: "0%", 
                desc: p 
              })),
              keyErrors: [],
              advice: {
                content: result.data.report.forStudent.advice,
                habit: result.data.report.forParent.guidance ? [result.data.report.forParent.guidance] : []
              }
            },
            paperAppearance: result.data.paperAppearance
          };

          setDashboardData({
            score: summaryData.totalScore,
            fullScore: summaryData.fullScore,
            typeAnalysis,
            classAverage: summaryData.classAverage,
            scoreChange: summaryData.scoreChange,
            strongestKnowledge: summaryData.strongestKnowledge,
            weakestKnowledge: summaryData.weakestKnowledge,
            summary: summaryData.overview,
            paperAppearance: result.data.paperAppearance
          });

          onAnalyzeComplete(reportData);
        } else {
          throw new Error(result.errorMessage || '分析失败');
        }

      } else if (dashboardData) {
        // 场景 2: 如果是表格数据 (已有 dashboardData)
        // 这里可以直接使用 dashboardData 生成报告，或者再次调用后端进行深度分析
        // 为了演示，我们直接构造数据并跳转
        const reportData = {
            studentInfo,
            summary: {
                totalScore: dashboardData.score,
                fullScore: dashboardData.fullScore,
                classAverage: dashboardData.classAverage || 79,
                classRank: 8, // Mock
                totalStudents: 52, // Mock
                scoreChange: 6, // Mock
                overview: dashboardData.summary || "成绩平稳。",
                strongestKnowledge: dashboardData.strongestKnowledge,
                weakestKnowledge: dashboardData.weakestKnowledge
            },
            typeAnalysis: dashboardData.typeAnalysis,
            modules: {
                evaluation: [
                    dashboardData.summary || "暂无评价",
                    `优势学科：${dashboardData.strongestKnowledge || '无'}`,
                    `薄弱环节：${dashboardData.weakestKnowledge || '无'}`
                ],
                problems: [
                    { name: dashboardData.weakestKnowledge || "未知", rate: "Low", desc: "需重点加强" }
                ],
                keyErrors: [],
                advice: {
                    content: dashboardData.suggestions || ["建议加强基础练习"],
                    habit: ["注意审题", "规范书写"]
                }
            }
        };
        onAnalyzeComplete(reportData);
      }

    } catch (error: any) {
      console.error('Analysis failed:', error);
      alert(`分析失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-layout" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* 1. 顶部栏 (固定) */}
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

      {/* 设置面板 */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        studentInfo={studentInfo}
        onUpdateStudentInfo={setStudentInfo}
        llmConfig={llmConfig}
        onUpdateLlmConfig={setLlmConfig}
      />

      {/* 历史记录弹窗 */}
      {isHistoryOpen && (
        <div className="settings-overlay" style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 100,
            display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
            <div className="history-modal">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
                    <h3>历史考试记录</h3>
                    <button className="close-capsule-btn" onClick={() => setIsHistoryOpen(false)}>×</button>
                </div>
                
                {/* 汇总分析入口 (New Feature Placeholder) */}
                <div className="history-aggregate-card" onClick={() => {
                    setIsHistoryOpen(false);
                    setIsTrendsOpen(true);
                }}>
                    <div style={{display: 'flex', alignItems: 'center'}}>
                        <div className="aggregate-icon-wrapper">
                             <span style={{fontSize: 18}}>📈</span>
                        </div>
                        <div>
                            <div className="aggregate-title">学情趋势分析</div>
                            <div className="aggregate-subtitle">汇总分析所有历史考试报告</div>
                        </div>
                    </div>
                </div>

                {history.length === 0 ? (
                    <div style={{textAlign: 'center', color: '#999', padding: 20}}>暂无历史记录</div>
                ) : (
                    <div className="history-list">
                        {history.map((exam, index) => (
                            <div key={index} className="history-item" 
                                onClick={() => {
                                    if (onSwitchExam) onSwitchExam(index);
                                    setIsHistoryOpen(false);
                                }}
                            >
                                <div>
                                    <div style={{fontWeight: 'bold'}}>
                                        {exam.studentInfo?.examName || '未命名考试'}
                                        <span style={{fontSize: 12, fontWeight: 'normal', color: '#666', marginLeft: 8}}>
                                            {exam.studentInfo?.subject}
                                        </span>
                                    </div>
                                    <div style={{fontSize: 12, color: '#999'}}>
                                        {exam.studentInfo?.name} · {new Date(exam.timestamp || Date.now()).toLocaleDateString()}
                                    </div>
                                </div>
                                <div style={{fontSize: 16, fontWeight: 'bold', color: '#66BB6A'}}>
                                    {exam.summary?.totalScore}分
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      )}

      {/* 趋势分析弹窗 */}
      {isTrendsOpen && (
         <div className="settings-overlay" style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 110,
            display: 'flex', justifyContent: 'center', alignItems: 'center'
         }}>
             <div className="history-modal" style={{maxHeight: '80vh', overflowY: 'auto'}}>
                 <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
                     <h3>学情趋势分析</h3>
                     <button className="close-capsule-btn" onClick={() => setIsTrendsOpen(false)}>×</button>
                 </div>
                 
                 <div style={{padding: '10px 0'}}>
                     {trendData.exams.length === 0 ? (
                       <div style={{
                         background: '#fff',
                         borderRadius: 12,
                         padding: 20,
                         boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                         marginBottom: 12,
                         fontSize: 14,
                         color: '#555',
                         lineHeight: 1.6
                       }}>
                         目前还没有可用的历史记录。请先生成几次分析报告，再回来查看整体趋势。
                       </div>
                     ) : trendData.exams.length === 1 ? (
                       <div style={{
                         background: '#fff',
                         borderRadius: 12,
                         padding: 20,
                         boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                         marginBottom: 12,
                         fontSize: 14,
                         color: '#555',
                         lineHeight: 1.6
                       }}>
                         已记录 1 次考试。本页主要用于对比多次考试的变化，再完成至少 2 次考试后，趋势图和关键指标会自动更新。
                       </div>
                     ) : (
                       <>
                         <div style={{
                           background: '#fff',
                           borderRadius: 12,
                           padding: 20,
                           boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                           marginBottom: 20
                         }}>
                           <div style={{marginBottom: 10, fontWeight: 'bold', color: '#333'}}>
                             近{trendData.exams.length}次考试成绩趋势
                           </div>
                           <div style={{height: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 10px'}}>
                             <svg width="100%" height="100%" viewBox="0 0 300 150">
                               <line x1="0" y1="30" x2="300" y2="30" stroke="#eee" strokeWidth="1" strokeDasharray="4 4" />
                               <line x1="0" y1="70" x2="300" y2="70" stroke="#eee" strokeWidth="1" strokeDasharray="4 4" />
                               <line x1="0" y1="110" x2="300" y2="110" stroke="#eee" strokeWidth="1" strokeDasharray="4 4" />
                               <polyline
                                 points={trendData.chartPoints}
                                 fill="none"
                                 stroke="#66BB6A"
                                 strokeWidth="3"
                               />
                               {trendData.pointPositions.map((p, index) => (
                                 <circle key={index} cx={p.x} cy={p.y} r="4" fill="#66BB6A" />
                               ))}
                             </svg>
                           </div>
                           <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11, color: '#999'}}>
                             {trendData.labels.map((label, index) => (
                               <span key={index} style={{flex: 1, textAlign: 'center', whiteSpace: 'pre-wrap'}}>
                                 {label}
                               </span>
                             ))}
                           </div>
                         </div>

                         <div style={{display: 'flex', gap: 10, marginBottom: 20}}>
                           <div style={{flex: 1, background: '#E8F5E9', padding: 15, borderRadius: 12}}>
                             <div style={{fontSize: 12, color: '#666'}}>平均分</div>
                             <div style={{fontSize: 20, fontWeight: 'bold', color: '#2E7D32'}}>
                               {trendData.avgScore.toFixed(1)}
                             </div>
                           </div>
                           <div style={{flex: 1, background: '#FFF3E0', padding: 15, borderRadius: 12}}>
                             <div style={{fontSize: 12, color: '#666'}}>最高分</div>
                             <div style={{fontSize: 20, fontWeight: 'bold', color: '#EF6C00'}}>
                               {Math.max(...trendData.scores)}
                             </div>
                           </div>
                           <div style={{flex: 1, background: '#E3F2FD', padding: 15, borderRadius: 12}}>
                             <div style={{fontSize: 12, color: '#666'}}>整体变化</div>
                             <div style={{fontSize: 20, fontWeight: 'bold', color: trendData.improvement >= 0 ? '#1565C0' : '#D32F2F'}}>
                               {trendData.improvement >= 0 ? `+${trendData.improvement}` : trendData.improvement}
                             </div>
                           </div>
                         </div>
                       </>
                     )}

                     {trendData.exams.length > 0 && (
                       <div style={{background: '#f9f9f9', padding: 15, borderRadius: 12}}>
                         <div style={{fontWeight: 'bold', marginBottom: 8}}>能力结构变化</div>
                         <div style={{fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 6}}>
                           最近一次考试的突出优势：{trendData.latestStrongest || '暂未识别'}。
                         </div>
                         <div style={{fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 6}}>
                           最近一次考试的主要薄弱点：{trendData.latestWeakest || '暂未识别'}。
                         </div>
                         {(trendData.topStrongest || trendData.topWeakest) && (
                           <div style={{fontSize: 13, color: '#555', lineHeight: 1.6}}>
                             {trendData.topStrongest && (
                               <div>
                                 多次考试中最常作为强项出现的知识：{trendData.topStrongest}。
                               </div>
                             )}
                             {trendData.topWeakest && (
                               <div>
                                 多次考试中反复暴露的薄弱环节：{trendData.topWeakest}。
                               </div>
                             )}
                           </div>
                         )}
                       </div>
                     )}
                 </div>
             </div>
         </div>
      )}

      {/* 2. 可滚动内容区 */}
      <div className="home-content">
        
        {/* 3. 数据入口区 */}
        <div className="section-title">本次考试数据录入</div>
        <div className="entry-card-container">
            
            {/* 3.1 拍照录入卡片 */}
            <div className="entry-card" onClick={() => cameraInputRef.current?.click()}>
                <div className="entry-card-icon">
                    <Camera size={28} strokeWidth={1.5} />
                </div>
                <div className="entry-card-content">
                    <div className="entry-card-title">拍照录入</div>
                    <div className="entry-card-desc">拍摄试卷或成绩单<br/>后续支持自动识别题目与得分</div>
                    <div className="entry-card-status">
                        {files.filter(f => f.type.startsWith('image')).length > 0 
                            ? `已上传 ${files.filter(f => f.type.startsWith('image')).length} 张图片` 
                            : '尚未拍摄任何图片'}
                    </div>
                </div>
                <ChevronRight size={20} color="#ccc" />
                <input 
                    type="file" 
                    ref={cameraInputRef}
                    hidden 
                    accept="image/*" 
                    multiple
                    onChange={(e) => handleFileChange(e, 'image')}
                />
            </div>

            {/* 3.2 表格导入卡片 */}
            <div className="entry-card" onClick={() => excelInputRef.current?.click()}>
                <div className="entry-card-icon">
                    <FileSpreadsheet size={28} strokeWidth={1.5} />
                </div>
                <div className="entry-card-content">
                    <div className="entry-card-title">表格导入</div>
                    <div className="entry-card-desc">从 Excel 导入个人成绩<br/>支持上传个人成绩单或 Excel 文件</div>
                    <div className="entry-card-status">
                        {dashboardData ? '已导入成绩表' : '尚未导入成绩表'}
                    </div>
                </div>
                <ChevronRight size={20} color="#ccc" />
                <input 
                    type="file" 
                    ref={excelInputRef}
                    hidden 
                    accept=".csv,.xlsx" 
                    onChange={(e) => handleFileChange(e, 'excel')}
                />
            </div>
        </div>

        {/* 4. 成绩概览区 (有数据时显示) */}
        {dashboardData && (
            <>
                <div className="section-title">本次考试概览（当前学生）</div>
                <Dashboard 
                    score={dashboardData.score}
                    fullScore={dashboardData.fullScore}
                    typeAnalysis={dashboardData.typeAnalysis}
                    classAverage={dashboardData.classAverage}
                    scoreChange={dashboardData.scoreChange}
                    strongestKnowledge={dashboardData.strongestKnowledge}
                    weakestKnowledge={dashboardData.weakestKnowledge}
                    summary={dashboardData.summary}
                />
            </>
        )}
        
        {/* 底部留白，防止被操作栏遮挡 */}
        <div style={{ height: 40 }}></div>
      </div>

      {/* 5. 底部操作区 (固定) */}
      <div className="bottom-operation-bar">
        <button className="op-btn-secondary" onClick={() => setIsHistoryOpen(true)}>
            <RefreshCw size={14} style={{ marginRight: 6, verticalAlign: 'middle' }}/>
            切换考试
        </button>
        <button className="op-btn-primary" onClick={handleGenerateReport} disabled={loading}>
            {loading ? '生成中...' : '生成个人分析报告'}
        </button>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-card">
            <div className="loading-spinner" />
            <div className="loading-title">正在分析试卷</div>
            <div className="loading-desc">
              系统正在阅读整张试卷并生成个性化分析报告，这通常需要二三十秒。
            </div>
            <div className="loading-hint">
              请保持页面打开，不要反复点击按钮或关闭浏览器。
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
