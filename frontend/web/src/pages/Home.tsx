// =================================================================================
// 首页组件 (Home) - 优化版 (Page 1)
// =================================================================================

import React, { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import { Settings, Image as ImageIcon, Camera, FileSpreadsheet, ChevronRight, RefreshCw, GripVertical, Eye, RotateCw, Trash2, ArrowUp, ArrowDown, Plus } from 'lucide-react';
import { AnalyzeExamRequest, AnalyzeExamResponse } from '../types/api';
import { StudentProfile } from '../types/profile';
import { SettingsModal } from '../components/SettingsModal';
import { Dashboard } from '../components/Dashboard';
import { StudentProfileModal } from '../components/StudentProfileModal';

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

const parseProblemTextToKnowledgeItem = (rawText: any, index: number) => {
  const text = typeof rawText === 'string' ? rawText : JSON.stringify(rawText);
  const knowledgeMatch = text.match(/【知识点】([^【\n]+)/);
  const questionMatch = text.match(/【题号】([^【\n]+)/);
  const scoreMatch = text.match(/【得分】([^【\n]+)/);
  const reasonMatch = text.match(/【错因】([^【\n]+)/);
  const evidenceMatch = text.match(/【证据】([^【\n]+)/);
  const confidenceMatch = text.match(/【置信度】([^【\n]+)/);
  const fixMatch = text.match(/【最短改法】([^【\n]+)/);
  const name = knowledgeMatch && knowledgeMatch[1] ? knowledgeMatch[1].trim() : `问题${index + 1}`;
  const descParts: string[] = [];
  if (questionMatch && questionMatch[1]) {
    descParts.push(`题号：${questionMatch[1].trim()}`);
  } else if (evidenceMatch && evidenceMatch[1]) {
    const evidence = evidenceMatch[1].trim();
    const hits: string[] = [];
    const re = /题\s*([0-9]+(?:\([0-9]+\))?)/g;
    let m: RegExpExecArray | null = null;
    while ((m = re.exec(evidence)) !== null) {
      const v = String(m[1] || '').trim();
      if (v) hits.push(v);
    }
    const uniq = Array.from(new Set(hits));
    if (uniq.length > 0) descParts.push(`题号：${uniq.join('、')}`);
  }
  if (scoreMatch && scoreMatch[1]) {
    descParts.push(`得分：${scoreMatch[1].trim()}`);
  }
  if (reasonMatch && reasonMatch[1]) {
    descParts.push(`错因：${reasonMatch[1].trim()}`);
  }
  if (evidenceMatch && evidenceMatch[1]) {
    descParts.push(`证据：${evidenceMatch[1].trim()}`);
  }
  if (confidenceMatch && confidenceMatch[1]) {
    descParts.push(`置信度：${confidenceMatch[1].trim()}`);
  }
  if (fixMatch && fixMatch[1]) {
    descParts.push(`最短改法：${fixMatch[1].trim()}`);
  }
  const cleaned = text
    .replace(/【知识点】[^【\n]+/g, '')
    .replace(/【题号】[^【\n]+/g, '')
    .replace(/【得分】[^【\n]+/g, '')
    .replace(/【错因】[^【\n]+/g, '')
    .replace(/【证据】[^【\n]+/g, '')
    .replace(/【置信度】[^【\n]+/g, '')
    .replace(/【最短改法】[^【\n]+/g, '')
    .trim();
  if (cleaned) {
    descParts.push(cleaned);
  }
  return {
    name,
    rate: '重点关注',
    desc: descParts.join('；')
  };
};

interface HomeProps {
  onAnalyzeComplete: (result: any) => void;
  initialData?: any;
  history?: any[];
  onSwitchExam?: (index: number) => void;
}

export const Home: React.FC<HomeProps> = ({ onAnalyzeComplete, initialData, history = [], onSwitchExam }) => {
  // --- 状态管理 ---
  const [queueItems, setQueueItems] = useState<
    {
      id: string;
      file: File;
      kind: 'image' | 'excel';
      previewUrl?: string;
      rotation: 0 | 90 | 180 | 270;
    }[]
  >([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false); // 历史记录弹窗状态
  const [isTrendsOpen, setIsTrendsOpen] = useState(false); // 趋势分析弹窗状态
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isDropActive, setIsDropActive] = useState(false);
  const queueItemsRef = useRef<
    {
      id: string;
      file: File;
      kind: 'image' | 'excel';
      previewUrl?: string;
      rotation: 0 | 90 | 180 | 270;
    }[]
  >([]);
  const [activeTopStage, setActiveTopStage] = useState<'upload' | 'queue' | 'overview'>('upload');
  const homeContentRef = useRef<HTMLDivElement | null>(null);
  const uploadSectionRef = useRef<HTMLDivElement | null>(null);
  const queueSectionRef = useRef<HTMLDivElement | null>(null);
  const overviewSectionRef = useRef<HTMLDivElement | null>(null);

  const scrollHomeTo = (target: 'upload' | 'queue' | 'overview') => {
    const container = homeContentRef.current;
    const ref =
      target === 'upload'
        ? uploadSectionRef
        : target === 'queue'
          ? queueSectionRef
          : overviewSectionRef;
    const el = ref.current;
    if (!container || !el) return;

    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const nextTop = elRect.top - containerRect.top + container.scrollTop - 12;
    container.scrollTo({ top: nextTop, behavior: 'smooth' });
  };

  // --- 多用户档案管理 (Phase 2) ---
  const [profiles, setProfiles] = useState<StudentProfile[]>(() => {
    try {
      const saved = localStorage.getItem('studentProfiles');
      if (saved) return JSON.parse(saved);
      
      // Migration: Check if legacy studentInfo exists
      const legacy = localStorage.getItem('studentInfo');
      if (legacy) {
        const info = JSON.parse(legacy);
        return [{ ...info, id: info.id || 'default-student' }];
      }
      
      return [{
        id: 'default-student',
        name: '张三',
        grade: '七年级',
        subject: '数学',
        className: '2班',
        examName: '期中考试',
        examTime: new Date().toISOString().split('T')[0]
      }];
    } catch (e) {
       return [{
        id: 'default-student',
        name: '张三',
        grade: '七年级',
        subject: '数学',
        className: '2班',
        examName: '期中考试',
        examTime: new Date().toISOString().split('T')[0]
      }];
    }
  });

  const [currentProfileId, setCurrentProfileId] = useState<string>(() => {
    // Ensure currentProfileId is valid within loaded profiles
    const savedId = localStorage.getItem('currentProfileId');
    // We can't access profiles state here directly in initializer easily if we just defined it, 
    // but the initializer runs once. 
    // However, simpler to just read from localStorage or default.
    return savedId || 'default-student'; 
  });

  // Derived current student info (synced with profiles)
  // Ensure we always have a valid studentInfo even if ID mismatch
  const studentInfo = profiles.find(p => p.id === currentProfileId) || profiles[0];

  const showToast = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg(null), 3000);
  };

  const handleUpdateStudentInfo = (newInfo: any) => {
    setProfiles(prev => prev.map(p => p.id === studentInfo.id ? { ...p, ...newInfo } : p));
  };
  
  const handleAddProfile = () => {
    const name = window.prompt('请输入学生姓名:', '测试学生');
    if (!name) return; // Cancelled

    const newId = `student-${Date.now()}`;
    const newProfile: StudentProfile = {
      id: newId,
      name: name,
      grade: '七年级',
      subject: '数学',
      className: '1班',
      examName: '模拟测试',
      examTime: new Date().toISOString().split('T')[0]
    };
    setProfiles(prev => [...prev, newProfile]);
    setCurrentProfileId(newId);
  };

  const handleSwitchProfile = (id: string) => {
    setCurrentProfileId(id);
  };

  const handleDeleteProfile = (id: string) => {
    if (profiles.length <= 1) {
      showToast('至少保留一个档案');
      return;
    }
    if (window.confirm('确定要删除该学生档案吗？')) {
      const newProfiles = profiles.filter(p => p.id !== id);
      setProfiles(newProfiles);
      // If deleted current profile, switch to the first one
      if (id === currentProfileId || !newProfiles.find(p => p.id === currentProfileId)) {
         setCurrentProfileId(newProfiles[0].id);
      }
    }
  };

  useEffect(() => {
    localStorage.setItem('studentProfiles', JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem('currentProfileId', currentProfileId);
  }, [currentProfileId]);

  // 大模型配置
  const [llmConfig, setLlmConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('llmConfig');
      return saved ? JSON.parse(saved) : {
        provider: 'doubao',
        apiKey: '',
        modelId: ''
      };
    } catch (e) {
      return {
        provider: 'doubao',
        apiKey: '',
        modelId: ''
      };
    }
  });

  const [trialAccessCode, setTrialAccessCode] = useState(() => {
    try {
      const saved = localStorage.getItem('trialAccessCode');
      return saved ? JSON.parse(saved) : '';
    } catch (e) {
      return '';
    }
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
    try {
      const saved = localStorage.getItem('dashboardData');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const buildPracticeQuestions = (
    rawList: string[] | undefined,
    weakest: string | undefined,
    subject: string | undefined
  ) => {
    if (Array.isArray(rawList) && rawList.length > 0) {
      return rawList;
    }
    const weakText = weakest || '错题相关';
    const subj = subject || '本学科';
    // 在表格导入等无法调用 AI 时，生成通用的学生练习指令，而非给老师的建议
    return [
      `【基础题】请针对“${weakText}”知识点，查找课本或笔记，抄写并背诵相关定义/公式/概念。`,
      `【错题重做】请将本次考试中关于“${weakText}”的错题，在纠错本上重新抄写一遍并独立解答。`,
      `【举一反三】请在练习册中寻找一道与“${weakText}”相关的习题（${subj}），完成并自我批改。`
    ];
  };

  // --- 监听 initialData 变化 (用于切换考试) ---
  React.useEffect(() => {
    if (initialData) {
      if (initialData.studentInfo) {
        handleUpdateStudentInfo(initialData.studentInfo);
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
  // Note: studentInfo persistence is now handled by profiles effect

  React.useEffect(() => {
    localStorage.setItem('llmConfig', JSON.stringify(llmConfig));
  }, [llmConfig]);

  React.useEffect(() => {
    localStorage.setItem('trialAccessCode', JSON.stringify(trialAccessCode));
  }, [trialAccessCode]);

  React.useEffect(() => {
    if (dashboardData) {
      localStorage.setItem('dashboardData', JSON.stringify(dashboardData));
    }
  }, [dashboardData]);

  // 趋势数据计算
  const trendData = React.useMemo(() => {
    // 按时间正序排列
    const sortedHistory = [...history].sort((a, b) => {
      const t1 = new Date(a.timestamp || 0).getTime();
      const t2 = new Date(b.timestamp || 0).getTime();
      return t1 - t2;
    });

    const limitedExams = sortedHistory.slice(-5); // 只取最近 5 次
    const scores = limitedExams.map(
      (exam) => exam.summary?.totalScore ?? exam.score ?? 0
    );
    const labels = limitedExams.map((exam) =>
      (exam.studentInfo?.examName || '未命名').replace('2024', '').replace('2025', '')
    );

    const maxScore = Math.max(...scores, 100); // Y轴最大值至少 100
    const avgScore =
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;

    const improvement =
      scores.length >= 2
        ? scores[scores.length - 1] - scores[scores.length - 2]
        : 0;

    // SVG 坐标计算
    const chartHeight = 150;
    const chartWidth = 300;
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
      latestExam?.summary?.strongestKnowledge ??
      latestExam?.strongestKnowledge ??
      '';
    const latestWeakest =
      latestExam?.summary?.weakestKnowledge ??
      latestExam?.weakestKnowledge ??
      '';

    // 计算验收通过率 (Parent Dashboard)
    const passedCount = limitedExams.filter(e => e.acceptanceResult?.passed).length;
    const passRate = limitedExams.length > 0 
        ? Math.round((passedCount / limitedExams.length) * 100) 
        : 0;
    
    // 计算错因复发 (Mock Logic: simply based on repeated weakest knowledge)
    const recurringWeakness = topWeakestEntry && topWeakestEntry[1] > 1 ? topWeakestEntry[0] : null;

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
      passRate,
      recurringWeakness
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
      const nextItems = selectedFiles.map((file) => {
        const id = `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        const isImage = type === 'image' && file.type.startsWith('image/');
        const previewUrl = isImage ? URL.createObjectURL(file) : undefined;
        return {
          id,
          file,
          kind: type,
          previewUrl,
          rotation: 0 as 0 | 90 | 180 | 270,
        };
      });
      setQueueItems((prev) => [...prev, ...nextItems]);
      
      // 如果是Excel，尝试预解析以显示概览
      if (type === 'excel' && selectedFiles[0].name.endsWith('.csv')) {
        parsePreview(selectedFiles[0]);
      }
    }
    e.target.value = '';
  };

  const addQueueFiles = (incoming: File[]) => {
    const files = Array.isArray(incoming) ? incoming : [];
    if (files.length === 0) return;

    const nextItems = files.map((file) => {
      const isImage = file.type.startsWith('image/');
      const isExcel = /\.csv$/i.test(file.name) || /\.xlsx$/i.test(file.name);
      const kind: 'image' | 'excel' = isExcel && !isImage ? 'excel' : 'image';
      const id = `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const previewUrl = kind === 'image' ? URL.createObjectURL(file) : undefined;
      return {
        id,
        file,
        kind,
        previewUrl,
        rotation: 0 as 0 | 90 | 180 | 270,
      };
    });

    setQueueItems((prev) => [...prev, ...nextItems]);

    const csv = files.find((f) => /\.csv$/i.test(f.name));
    if (csv) parsePreview(csv);
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

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const loadImageFromObjectUrl = (objectUrl: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('图片读取失败'));
      img.src = objectUrl;
    });
  };

  const compressImageToDataURL = async (file: File, rotation: 0 | 90 | 180 | 270): Promise<string> => {
    const shouldSkip =
      file.size <= 700 * 1024 &&
      (file.type === 'image/jpeg' || file.type === 'image/jpg');
    if (shouldSkip && rotation === 0) {
      return readFileAsDataURL(file);
    }

    const maxEdge = 1600;
    const quality = 0.78;
    const outputType = 'image/jpeg';

    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await loadImageFromObjectUrl(objectUrl);

      const srcW = img.naturalWidth || img.width;
      const srcH = img.naturalHeight || img.height;
      const maxDim = Math.max(srcW, srcH);
      const scale = maxDim > maxEdge ? maxEdge / maxDim : 1;
      const targetW = Math.max(1, Math.round(srcW * scale));
      const targetH = Math.max(1, Math.round(srcH * scale));

      const canvas = document.createElement('canvas');
      const rot = rotation % 360;
      const rotated = rot === 90 || rot === 270;
      canvas.width = rotated ? targetH : targetW;
      canvas.height = rotated ? targetW : targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return readFileAsDataURL(file);
      }

      ctx.save();
      if (rot === 90) {
        ctx.translate(canvas.width, 0);
        ctx.rotate(Math.PI / 2);
      } else if (rot === 180) {
        ctx.translate(canvas.width, canvas.height);
        ctx.rotate(Math.PI);
      } else if (rot === 270) {
        ctx.translate(0, canvas.height);
        ctx.rotate((3 * Math.PI) / 2);
      }
      ctx.drawImage(img, 0, 0, targetW, targetH);
      ctx.restore();
      const dataUrl = canvas.toDataURL(outputType, quality);
      return dataUrl;
    } catch {
      return readFileAsDataURL(file);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  // 辅助：文件转 Base64（手机端对图片做压缩，提升上传成功率）
  const fileToBase64 = (file: File, rotation: 0 | 90 | 180 | 270): Promise<string> => {
    if (file.type.startsWith('image/')) {
      return compressImageToDataURL(file, rotation);
    }
    return readFileAsDataURL(file);
  };

  const imageItems = React.useMemo(() => {
    return queueItems.filter((x) => x.kind === 'image' && x.file.type.startsWith('image/'));
  }, [queueItems]);

  const hasExcel = React.useMemo(() => {
    return queueItems.some((x) => x.kind === 'excel');
  }, [queueItems]);

  const canStart = imageItems.length > 0 || !!dashboardData;

  const estimateSeconds = React.useMemo(() => {
    const base = 12;
    const per = 4;
    const secs = base + imageItems.length * per;
    return Math.max(10, Math.min(90, secs));
  }, [imageItems.length]);

  const clearQueue = () => {
    queueItems.forEach((x) => {
      if (x.previewUrl) URL.revokeObjectURL(x.previewUrl);
    });
    setQueueItems([]);
    setDashboardData(null);
    setPreviewId(null);
  };

  React.useEffect(() => {
    queueItemsRef.current = queueItems;
  }, [queueItems]);

  React.useEffect(() => {
    return () => {
      queueItemsRef.current.forEach((x) => {
        if (x.previewUrl) URL.revokeObjectURL(x.previewUrl);
      });
    };
  }, []);

  const removeItem = (id: string) => {
    setQueueItems((prev) => {
      const hit = prev.find((x) => x.id === id);
      if (hit?.previewUrl) URL.revokeObjectURL(hit.previewUrl);
      if (hit?.kind === 'excel') {
        setDashboardData(null);
      }
      const next = prev.filter((x) => x.id !== id);
      return next;
    });
    if (previewId === id) setPreviewId(null);
  };

  const rotateItem = (id: string) => {
    setQueueItems((prev) => {
      return prev.map((x) => {
        if (x.id !== id) return x;
        const next = ((x.rotation + 90) % 360) as 0 | 90 | 180 | 270;
        return { ...x, rotation: next };
      });
    });
  };

  const moveImageItem = (fromId: string, toId: string) => {
    setQueueItems((prev) => {
      const fromIdx = prev.findIndex((x) => x.id === fromId);
      const toIdx = prev.findIndex((x) => x.id === toId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const from = prev[fromIdx];
      const to = prev[toIdx];
      if (from.kind !== 'image' || to.kind !== 'image') return prev;
      const next = [...prev];
      next.splice(fromIdx, 1);
      const insertIdx = fromIdx < toIdx ? toIdx - 1 : toIdx;
      next.splice(insertIdx, 0, from);
      return next;
    });
  };

  // 执行分析并跳转 (生成个人分析报告)
  const handleGenerateReport = async () => {
    if (!canStart) {
      showToast('请先录入数据（拍照或导入表格）！');
      return;
    }

    setLoading(true);
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setLoading(false);
      showToast('当前网络已断开，请检查 Wi-Fi/数据网络后重试。');
      return;
    }

    try {
      // 场景 1: 如果有上传的图片，优先使用图片分析 API
      if (imageItems.length > 0) {
        // 1. 转 Base64
        const base64Images = await Promise.all(imageItems.map((x) => fileToBase64(x.file, x.rotation)));
        
        // 2. 调用后端 API
        const payload = {
          images: base64Images,
          provider: llmConfig.provider,
          subject: studentInfo.subject, // Pass the selected subject
          grade: studentInfo.grade, // Pass the grade for tone adjustment
        };

        const controller = new AbortController();
        const timeoutMs = Math.max(25_000, Math.min(120_000, estimateSeconds * 1000 + 20_000));
        const timer = window.setTimeout(() => controller.abort(), timeoutMs);
        const response = await fetch('/api/analyze-images', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(trialAccessCode ? { 'x-access-code': trialAccessCode } : {}),
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }).finally(() => window.clearTimeout(timer));

        const json = await response.json().catch(() => ({} as any));
        if (!response.ok || json?.success === false) {
          const err: any = new Error(json?.errorMessage || response.statusText || '分析失败');
          err.status = response.status;
          throw err;
        }

        const result: AnalyzeExamResponse = json;
        
        if (result.success && result.data) {
          const typeAnalysis = result.data.typeAnalysis || [];
          const inferredFullScore = typeAnalysis.length > 0
            ? typeAnalysis.reduce((sum, item) => sum + (item.full || 0), 0)
            : 100;
          const mergedStudentInfo = {
            ...studentInfo,
            subject: result.data.subject || studentInfo.subject,
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

          const practiceQuestions = buildPracticeQuestions(
            result.data.practiceQuestions,
            result.data.summary.weakestKnowledge,
            mergedStudentInfo.subject
          );

          const reportData = {
            studentInfo: mergedStudentInfo,
            summary: summaryData,
            typeAnalysis,
            review: result.data.review,
            studyMethods: result.data.studyMethods,
            startTime: Date.now(), // V0.1 采集埋点：开始复盘时间
            modules: {
              evaluation: [
                result.data.report.forStudent.overall,
                ...result.data.report.forStudent.problems.slice(0, 1)
              ],
              problems: (result.data.report.forStudent.problems || []).map((p, idx) =>
                parseProblemTextToKnowledgeItem(p, idx)
              ),
              keyErrors: [],
              advice: {
                content: result.data.report.forStudent.advice,
                habit: (() => {
                  const g = result.data.report.forParent.guidance;
                  if (!g) return [];
                  if (Array.isArray(g)) return g;
                  if (typeof g === 'string') return [g];
                  // Handle object case (e.g. { "习惯养成": [...] })
                  if (typeof g === 'object') {
                    if (g['习惯养成']) {
                        return Array.isArray(g['习惯养成']) ? g['习惯养成'] : [String(g['习惯养成'])];
                    }
                    // Fallback: extract all string values
                    return Object.values(g).flat().map(String);
                  }
                  return [];
                })()
              }
            },
            paperAppearance: result.data.paperAppearance,
            practiceQuestions,
            practicePaper: result.data.practicePaper, // Pass the structured paper data
            acceptanceQuiz: result.data.acceptanceQuiz // Pass acceptance quiz
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
        const practiceQuestions = buildPracticeQuestions(
            [],
            dashboardData.weakestKnowledge,
            studentInfo.subject
        );

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
            startTime: Date.now(), // V0.1 采集埋点
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
            },
            practiceQuestions
        };
        onAnalyzeComplete(reportData);
      }

    } catch (error: any) {
      console.error('Analysis failed:', error);
      const msg = String(error?.message || '').trim();
      const status = Number((error as any)?.status || 0);

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        showToast('分析失败：当前网络连接异常，请检查 Wi-Fi/数据网络后重试。');
        return;
      }

      if (String(error?.name || '') === 'AbortError') {
        showToast('分析超时：请减少图片数量或稍后重试。');
        return;
      }

      if (status === 401 || msg.includes('访问口令')) {
        showToast('访问口令错误或缺失：请在设置中填写正确的口令。');
        return;
      }

      if (status === 429 || msg.includes('请求过于频繁') || msg.includes('额度')) {
        showToast(msg || '请求过于频繁，请稍后再试。');
        return;
      }

      if (msg.includes('API Key') || msg.includes('未配置')) {
        showToast('后端大模型配置异常（API Key 或模型未配置），请检查服务器环境或更换服务商。');
        return;
      }

      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        showToast('无法连接到分析服务器，请确认后端已启动并检查网络。');
        return;
      }

      if (msg.includes('图片分析失败')) {
        showToast(msg);
        return;
      }

      if (!msg) {
        showToast('服务器暂时不可用，请稍后再试。');
        return;
      }

      showToast(`分析失败：${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="home-layout"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflow: 'hidden',
        ['--theme' as any]: getThemeColor(studentInfo.subject),
        ['--theme-cta' as any]: getThemeColor(studentInfo.subject),
      }}
    >
      <div className="context-bar">
        <div className="context-left">
          <div className="context-info">
            <div className="context-title">{studentInfo.subject}分析</div>
            <div className="context-meta">
              <span>{studentInfo.name}</span>
              <span>•</span>
              <span>{studentInfo.examName}</span>
            </div>
          </div>
        </div>
        <div className="stage-progress">
          <button
            className={`stage-step ${activeTopStage === 'upload' ? 'active' : ''}`}
            onClick={() => {
              setActiveTopStage('upload');
              scrollHomeTo('upload');
            }}
          >
            上传
          </button>
          <button
            className={`stage-step ${activeTopStage === 'queue' ? 'active' : ''}`}
            onClick={() => {
              setActiveTopStage('queue');
              scrollHomeTo('queue');
            }}
          >
            队列
          </button>
          <button
            className={`stage-step ${activeTopStage === 'overview' ? 'active' : ''}`}
            onClick={() => {
              if (!dashboardData) return;
              setActiveTopStage('overview');
              scrollHomeTo('overview');
            }}
            disabled={!dashboardData}
          >
            概览
          </button>
        </div>
        <div className="context-actions control-panel">
          <button className="settings-btn" onClick={() => setIsHistoryOpen(true)} title="切换考试">
            <RefreshCw size={20} color="#64748b" />
          </button>
          <button className="settings-btn" onClick={() => setIsSettingsOpen(true)} title="设置">
            <Settings size={20} color="#64748b" />
          </button>
        </div>
      </div>

      {/* 设置面板 */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        studentInfo={studentInfo}
        onUpdateStudentInfo={handleUpdateStudentInfo}
        profiles={profiles}
        currentProfileId={currentProfileId}
        onSwitchProfile={handleSwitchProfile}
        onAddProfile={handleAddProfile}
        onDeleteProfile={handleDeleteProfile}
        trialAccessCode={trialAccessCode}
        onUpdateTrialAccessCode={setTrialAccessCode}
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
                                        {exam.acceptanceResult?.passed && (
                                            <span style={{
                                                fontSize: 10, 
                                                color: '#fff', 
                                                background: '#4CAF50', 
                                                padding: '2px 6px', 
                                                borderRadius: 4, 
                                                marginLeft: 8,
                                                verticalAlign: 'middle'
                                            }}>
                                                已验收
                                            </span>
                                        )}
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

      {/* 趋势分析弹窗 (V4.0 学情档案) */}
      <StudentProfileModal 
        isOpen={isTrendsOpen}
        onClose={() => setIsTrendsOpen(false)}
        history={history}
        onSwitchExam={onSwitchExam}
      />

      {/* 2. 可滚动内容区 */}
      <div className="home-content" ref={homeContentRef}>
        
        {/* 0. 学科切换 */}
        <div style={{ padding: '16px 20px 0 20px' }}>
          <div style={{ 
            background: '#fff', 
            borderRadius: 12, 
            padding: '12px 16px',
            display: 'flex', 
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <span style={{ fontSize: 14, color: '#666', marginRight: 12 }}>当前学科:</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {['数学', '语文', '英语'].map(subj => (
                <button
                  key={subj}
                  onClick={() => handleUpdateStudentInfo({ subject: subj })}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: 13,
                    border: studentInfo.subject === subj ? 'none' : '1px solid #eee',
                    background: studentInfo.subject === subj ? 'rgb(var(--theme-rgb, 37 99 235))' : '#f5f5f5',
                    color: studentInfo.subject === subj ? '#fff' : '#666',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {subj}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="section-title" ref={uploadSectionRef}>上传指挥台</div>
        <div
          className={`cmd-card upload-deck ${isDropActive ? 'drop-active' : ''}`}
          onDragEnter={(e) => {
            if (e.dataTransfer?.types?.includes('Files')) setIsDropActive(true);
          }}
          onDragOver={(e) => {
            if (e.dataTransfer?.types?.includes('Files')) {
              e.preventDefault();
              setIsDropActive(true);
            }
          }}
          onDragLeave={(e) => {
            if (e.currentTarget === e.target) setIsDropActive(false);
          }}
          onDrop={(e) => {
            const dropped = Array.from(e.dataTransfer.files || []);
            if (dropped.length > 0) {
              e.preventDefault();
              addQueueFiles(dropped);
            }
            setIsDropActive(false);
          }}
        >
          <div className="upload-statusbar">
            <div className="upload-status-left">
              <div className="upload-status-title">
                {imageItems.length > 0 ? `已上传 ${imageItems.length} 张` : (hasExcel ? '已导入成绩表' : '请上传试卷图片')}
              </div>
              <div className="upload-status-sub">
                {canStart ? `预计 ${estimateSeconds} 秒｜页序可拖动调整` : '上传后将自动校验页序与清晰度'}
              </div>
            </div>
            <div className="upload-status-right">
              <button className="upload-mini-btn" onClick={() => cameraInputRef.current?.click()} disabled={loading}>
                <Camera size={16} />
                添加图片
              </button>
              <button className="upload-mini-btn" onClick={() => excelInputRef.current?.click()} disabled={loading}>
                <FileSpreadsheet size={16} />
                导入表格
              </button>
              <input
                type="file"
                ref={cameraInputRef}
                hidden
                accept="image/*"
                multiple
                onChange={(e) => handleFileChange(e, 'image')}
              />
              <input
                type="file"
                ref={excelInputRef}
                hidden
                accept=".csv,.xlsx"
                onChange={(e) => handleFileChange(e, 'excel')}
              />
            </div>
          </div>

          <div className="upload-table-wrap" ref={queueSectionRef}>
            {queueItems.length === 0 ? (
              <div className="upload-empty">
                <div className="upload-empty-icon">
                  <ImageIcon size={18} />
                </div>
                <div className="upload-empty-text">把试卷照片拖进来或点击“添加图片”</div>
              </div>
            ) : (
              <table className="upload-table">
                <thead>
                  <tr>
                    <th style={{ width: 34 }}></th>
                    <th style={{ width: 52 }}>预览</th>
                    <th>名称</th>
                    <th style={{ width: 64 }}>页码</th>
                    <th style={{ width: 76 }}>状态</th>
                    <th style={{ width: 120, textAlign: 'right' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {queueItems.map((item) => {
                    const isImage = item.kind === 'image' && item.file.type.startsWith('image/');
                    const imgIndex = isImage ? imageItems.findIndex((x) => x.id === item.id) : -1;
                    const pageText = isImage ? `P${imgIndex + 1}` : '-';
                    const statusText = isImage ? '就绪' : (dashboardData ? '已解析' : '待解析');
                    const dragOver = dragOverId === item.id && draggingId && draggingId !== item.id;
                    return (
                      <tr
                        key={item.id}
                        className={`${isImage ? 'draggable' : ''} ${dragOver ? 'drag-over' : ''}`}
                        draggable={isImage}
                        onDragStart={(e) => {
                          if (!isImage) return;
                          setDraggingId(item.id);
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', item.id);
                        }}
                        onDragOver={(e) => {
                          if (!isImage) return;
                          e.preventDefault();
                          if (dragOverId !== item.id) setDragOverId(item.id);
                        }}
                        onDragLeave={() => {
                          if (dragOverId === item.id) setDragOverId(null);
                        }}
                        onDrop={(e) => {
                          if (!isImage) return;
                          e.preventDefault();
                          const fromId = String(e.dataTransfer.getData('text/plain') || '').trim();
                          if (fromId && fromId !== item.id) moveImageItem(fromId, item.id);
                          setDraggingId(null);
                          setDragOverId(null);
                        }}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDragOverId(null);
                        }}
                      >
                        <td className="upload-drag-cell">
                          {isImage ? <GripVertical size={16} /> : null}
                        </td>
                        <td>
                          {isImage ? (
                            <div
                              className="upload-thumb"
                              onClick={() => setPreviewId(item.id)}
                              role="button"
                              tabIndex={0}
                            >
                              <img
                                src={item.previewUrl}
                                style={{ transform: `rotate(${item.rotation}deg)` }}
                              />
                            </div>
                          ) : (
                            <div className="upload-filechip">
                              <FileSpreadsheet size={16} />
                            </div>
                          )}
                        </td>
                        <td className="upload-name">
                          <div className="upload-name-main">{item.file.name}</div>
                          <div className="upload-name-sub">{isImage ? '图片' : '表格'}</div>
                        </td>
                        <td className="upload-page">{pageText}</td>
                        <td>
                          <span className={`upload-status-pill ${isImage ? 'ok' : (dashboardData ? 'ok' : 'wait')}`}>
                            {statusText}
                          </span>
                        </td>
                        <td className="upload-actions">
                          {isImage ? (
                            <>
                              <button className="upload-icon-btn" onClick={() => setPreviewId(item.id)} title="预览">
                                <Eye size={16} />
                              </button>
                              <button className="upload-icon-btn" onClick={() => rotateItem(item.id)} title="旋转">
                                <RotateCw size={16} />
                              </button>
                              <button
                                className="upload-icon-btn"
                                onClick={() => {
                                  const idx = imageItems.findIndex((x) => x.id === item.id);
                                  if (idx > 0) moveImageItem(item.id, imageItems[idx - 1].id);
                                }}
                                title="上移"
                                disabled={imgIndex <= 0}
                              >
                                <ArrowUp size={16} />
                              </button>
                              <button
                                className="upload-icon-btn"
                                onClick={() => {
                                  const idx = imageItems.findIndex((x) => x.id === item.id);
                                  if (idx >= 0 && idx < imageItems.length - 1) moveImageItem(item.id, imageItems[idx + 1].id);
                                }}
                                title="下移"
                                disabled={imgIndex < 0 || imgIndex >= imageItems.length - 1}
                              >
                                <ArrowDown size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button className="upload-icon-btn" onClick={() => excelInputRef.current?.click()} title="重新导入">
                                <Plus size={16} />
                              </button>
                            </>
                          )}
                          <button className="upload-icon-btn danger" onClick={() => removeItem(item.id)} title="删除">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 4. 成绩概览区 (有数据时显示) */}
        {dashboardData && (
            <>
                <div className="section-title" ref={overviewSectionRef}>本次考试概览（当前学生）</div>
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
      <div className="bottom-operation-bar bottom-operation-bar--home">
        <button
          className="op-btn-secondary op-btn-icon"
          onClick={() => setIsHistoryOpen(true)}
          title="切换考试"
          data-tooltip="切换考试"
          aria-label="切换考试"
        >
          <RefreshCw size={18} />
        </button>
        <button
          className="op-btn-secondary op-btn-icon"
          onClick={clearQueue}
          disabled={loading || (queueItems.length === 0 && !dashboardData)}
          title="清空队列"
          data-tooltip="清空队列"
          aria-label="清空队列"
        >
          <Trash2 size={18} />
        </button>
        <button
          className="op-btn-secondary op-btn-icon"
          onClick={() => cameraInputRef.current?.click()}
          disabled={loading}
          title="继续添加"
          data-tooltip="继续添加"
          aria-label="继续添加"
        >
          <Plus size={18} />
        </button>
        <button
          className="op-btn-primary op-btn-icon op-btn-icon-primary"
          onClick={handleGenerateReport}
          disabled={loading || !canStart}
          title={loading ? '分析中...' : '开始分析'}
          data-tooltip={loading ? '分析中...' : '开始分析'}
          aria-label={loading ? '分析中' : '开始分析'}
        >
          <ChevronRight size={22} />
        </button>
      </div>

      {toastMsg && (
        <div className="toast-float">{toastMsg}</div>
      )}

      {previewId && (
        <div
          className="settings-overlay"
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            background: 'rgba(15, 23, 42, 0.55)',
            zIndex: 130,
          }}
          onClick={() => setPreviewId(null)}
        >
          {(() => {
            const item = queueItems.find((x) => x.id === previewId);
            if (!item || item.kind !== 'image' || !item.previewUrl) return null;
            return (
              <div
                style={{
                  width: '92%',
                  maxWidth: 720,
                  maxHeight: '86vh',
                  background: 'rgba(255,255,255,0.92)',
                  borderRadius: 16,
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.6)',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottom: '1px solid rgba(148, 163, 184, 0.25)' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.file.name}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="upload-mini-btn" onClick={() => rotateItem(item.id)}>
                      <RotateCw size={16} />
                      旋转
                    </button>
                    <button className="upload-mini-btn" onClick={() => setPreviewId(null)}>
                      关闭
                    </button>
                  </div>
                </div>
                <div style={{ padding: 12, background: 'rgba(241, 245, 249, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <img
                    src={item.previewUrl}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '74vh',
                      borderRadius: 12,
                      border: '1px solid rgba(148, 163, 184, 0.28)',
                      background: '#fff',
                      transform: `rotate(${item.rotation}deg)`,
                      boxShadow: '0 10px 30px rgba(15, 23, 42, 0.14)',
                    }}
                  />
                </div>
              </div>
            );
          })()}
        </div>
      )}

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
