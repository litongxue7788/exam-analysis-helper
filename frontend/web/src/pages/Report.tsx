// =================================================================================
// 个人分析报告页 (Report) - 优化版 (Page 2)
// =================================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Settings, Download, ArrowLeft, Share2, PanelRightClose, PanelRightOpen, GripHorizontal, BookOpen, LayoutDashboard, Calendar, X, Menu, ArrowRightLeft, GraduationCap } from 'lucide-react';
import { SettingsModal } from '../components/SettingsModal';
import { PrintLayout } from '../components/PrintLayout';
import { AcceptanceModal } from '../components/AcceptanceModal';
import { StudyMethodsModal } from '../components/StudyMethodsModal';
import { getAbilityInfoBySubject } from '../config/subjectConfig';
import { LatexRenderer } from '../components/LatexRenderer';

interface ReportProps {
  data: any;
  onBack?: () => void;
  onOpenPractice?: () => void;
  onOpenNotebook?: () => void;
  onOpenDashboard?: () => void;
  onUpdateExam?: (newData: any) => void;
}

export const Report: React.FC<ReportProps> = ({ data, onBack, onOpenPractice, onOpenNotebook, onOpenDashboard, onUpdateExam }) => {
  const parseProblemDetail = (raw: any) => {
    const desc = String(raw?.desc ?? raw ?? '').trim();
    const take = (re: RegExp) => {
      const m = desc.match(re);
      return m && m[1] ? String(m[1]).trim() : '';
    };

    const bracket = {
      questionNo: take(/【题号】([^【\n]+)/),
      score: take(/【得分】([^【\n]+)/),
      reason: take(/【错因】([^【\n]+)/),
      evidence: take(/【证据】([^【\n]+)/),
      confidence: take(/【置信度】([^【\n]+)/),
      fix: take(/【最短改法】([^【\n]+)/),
    };

    const parts = desc
      .split('；')
      .map((s) => s.trim())
      .filter(Boolean);

    const colon = {
      questionNo: parts.find((p) => p.startsWith('题号：') || p.startsWith('题号:'))?.replace(/^题号[:：]\s*/, '') || '',
      score: parts.find((p) => p.startsWith('得分：') || p.startsWith('得分:'))?.replace(/^得分[:：]\s*/, '') || '',
      reason: parts.find((p) => p.startsWith('错因：') || p.startsWith('错因:'))?.replace(/^错因[:：]\s*/, '') || '',
      evidence: parts.find((p) => p.startsWith('证据：') || p.startsWith('证据:'))?.replace(/^证据[:：]\s*/, '') || '',
      confidence: parts.find((p) => p.startsWith('置信度：') || p.startsWith('置信度:'))?.replace(/^置信度[:：]\s*/, '') || '',
      fix: parts.find((p) => p.startsWith('最短改法：') || p.startsWith('最短改法:'))?.replace(/^最短改法[:：]\s*/, '') || '',
    };

    const questionNo = bracket.questionNo || colon.questionNo;
    const score = bracket.score || colon.score;
    const reason = bracket.reason || colon.reason;
    const evidence = bracket.evidence || colon.evidence;
    const confidenceRaw = bracket.confidence || colon.confidence;
    const fix = bracket.fix || colon.fix;
    const questionNoFallback = (() => {
      if (questionNo) return questionNo;
      const ev = String(evidence || '').trim();
      if (!ev) return '';
      const hits: string[] = [];
      const re = /题\s*([0-9]+(?:\([0-9]+\))?)/g;
      let m: RegExpExecArray | null = null;
      while ((m = re.exec(ev)) !== null) {
        const v = String(m[1] || '').trim();
        if (v) hits.push(v);
      }
      const uniq = Array.from(new Set(hits));
      return uniq.length > 0 ? uniq.join('、') : '';
    })();

    const confidence = (() => {
      const c = String(confidenceRaw || '').trim();
      if (!c) return '';
      if (c === '高' || c.toLowerCase() === 'high') return '高';
      if (c === '中' || c.toLowerCase() === 'medium') return '中';
      if (c === '低' || c.toLowerCase() === 'low') return '低';
      return c;
    })();

    const cleaned = desc
      .replace(/【题号】[^【\n]+/g, '')
      .replace(/【得分】[^【\n]+/g, '')
      .replace(/【错因】[^【\n]+/g, '')
      .replace(/【证据】[^【\n]+/g, '')
      .replace(/【置信度】[^【\n]+/g, '')
      .replace(/【最短改法】[^【\n]+/g, '')
      .replace(/^题号[:：][^；]+/g, '')
      .replace(/^得分[:：][^；]+/g, '')
      .replace(/^错因[:：][^；]+/g, '')
      .replace(/^证据[:：][^；]+/g, '')
      .replace(/^置信度[:：][^；]+/g, '')
      .replace(/^最短改法[:：][^；]+/g, '')
      .trim();

    return { questionNo: questionNoFallback, score, reason, evidence, confidence, fix, rest: cleaned };
  };

  const getConfidenceStyle = (confidence: string) => {
    if (confidence === '高') return { bg: '#E8F5E9', color: '#2E7D32', border: '#C8E6C9' };
    if (confidence === '中') return { bg: '#FFF8E1', color: '#FF8F00', border: '#FFE082' };
    if (confidence === '低') return { bg: '#FFEBEE', color: '#C62828', border: '#FFCDD2' };
    return { bg: '#F5F5F5', color: '#666', border: '#eee' };
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
      desc: descParts.join('；'),
    };
  };

  const buildPracticeQuestions = (rawList: string[] | undefined, weakest: string | undefined, subject: string | undefined) => {
    if (Array.isArray(rawList) && rawList.length > 0) {
      return rawList;
    }
    const weakText = weakest || '错题相关';
    const subj = subject || '本学科';
    return [
      `【基础题】请针对“${weakText}”知识点，查找课本或笔记，抄写并背诵相关定义/公式/概念。`,
      `【错题重做】请将本次考试中关于“${weakText}”的错题，在纠错本上重新抄写一遍并独立解答。`,
      `【举一反三】请在练习册中寻找一道与“${weakText}”相关的习题（${subj}），完成并自我批改。`,
    ];
  };

  // 如果没有真实数据，使用默认结构防止崩溃，但尽量使用传入的 data
  // 假设 data 结构为 { studentInfo, summary, modules }
  const studentInfo = data?.studentInfo || {
    name: '学生', grade: '年级', subject: '待定', className: '班级', examName: '考试'
  };

  const summary = data?.summary || {
    totalScore: 0,
    fullScore: 100,
    classAverage: 0,
    classRank: 0,
    totalStudents: 0,
    scoreChange: 0,
    overview: "等待分析..."
  };

  const modules = data?.modules || {
    evaluation: [
        "等待分析结果生成...",
    ],
    problems: [],
    keyErrors: [],
    advice: {
        content: ["暂无建议"],
        habit: ["暂无建议"]
    }
  };

  const typeAnalysis = data?.typeAnalysis || [];

  const getAbilityInfo = (type: string) => {
    return getAbilityInfoBySubject(type, studentInfo.subject);
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
  const themeRgb = useMemo(() => {
    const raw = String(theme || '').trim();
    const hex = raw.startsWith('#') ? raw.slice(1) : raw;
    const full = hex.length === 3 ? hex.split('').map((c) => `${c}${c}`).join('') : hex;
    if (!/^[0-9a-fA-F]{6}$/.test(full)) return '37 99 235';
    const num = parseInt(full, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `${r} ${g} ${b}`;
  }, [theme]);
  const reportStyle = useMemo(() => {
    return {
      ['--theme' as any]: theme,
      ['--theme-cta' as any]: theme,
      ['--theme-rgb' as any]: themeRgb,
    } as React.CSSProperties;
  }, [theme, themeRgb]);

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
  const [isStudyMethodsOpen, setIsStudyMethodsOpen] = useState(false);
  const [isAcceptanceOpen, setIsAcceptanceOpen] = useState(false); // 验收弹窗状态
  const [isPreviewOpen, setIsPreviewOpen] = useState(false); // 预览弹窗状态
  const [toastMsg, setToastMsg] = useState<string | null>(null); // Toast 状态
  const [activeStage, setActiveStage] = useState<'diagnosis' | 'training' | 'acceptance'>('diagnosis');
  const [generatingWeakPoint, setGeneratingWeakPoint] = useState<string | null>(null);
  const [generatingAcceptance, setGeneratingAcceptance] = useState(false);
  const [generatedAcceptanceQuiz, setGeneratedAcceptanceQuiz] = useState<any | null>(null);
  const [showIntro, setShowIntro] = useState(false);
  // 仅用于 SettingsModal 兼容
  const [llmConfig, setLlmConfig] = useState({ provider: 'doubao', apiKey: '', modelId: '' });
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
  const [isPreviewDragging, setIsPreviewDragging] = useState(false);
  const previewDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const [planMode, setPlanMode] = useState<'normal' | '20min'>(() => (((data as any)?.planMode || '') === '20min' ? '20min' : 'normal'));
  useEffect(() => {
    const next = (((data as any)?.planMode || '') === '20min' ? '20min' : 'normal') as 'normal' | '20min';
    setPlanMode(next);
  }, [(data as any)?.planMode]);
  const isPlanCompressed = planMode === '20min';

  const [trialAccessCode, setTrialAccessCode] = useState(() => {
    try {
      const saved = localStorage.getItem('trialAccessCode');
      const parsed = saved ? JSON.parse(saved) : '';
      return typeof parsed === 'string' ? parsed : '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('trialAccessCode', JSON.stringify(trialAccessCode));
    } catch {}
  }, [trialAccessCode]);

  const jobId = String((data as any)?.job?.id || (data as any)?.jobId || '').trim();
  const [jobImageCount, setJobImageCount] = useState<number>(() => Number((data as any)?.job?.imageCount || 0) || 0);
  const [jobEstimateSeconds, setJobEstimateSeconds] = useState<number>(() => Number((data as any)?.job?.estimateSeconds || 0) || 0);
  const estimateSeconds = useMemo(() => {
    if (jobEstimateSeconds > 0) return jobEstimateSeconds;
    const base = 55;
    const per = 45;
    const secs = base + jobImageCount * per;
    return Math.max(45, Math.min(360, secs));
  }, [jobEstimateSeconds, jobImageCount]);
  const [jobStatus, setJobStatus] = useState<string>(() => String((data as any)?.job?.status || '').trim());
  const [jobStage, setJobStage] = useState<string>(() => String((data as any)?.job?.stage || '').trim());
  const [jobMessage, setJobMessage] = useState<string>('');
  const [isPolling, setIsPolling] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const jobStatusRef = useRef(jobStatus);
  const jobStageRef = useRef(jobStage);
  useEffect(() => {
    jobStatusRef.current = jobStatus;
  }, [jobStatus]);
  useEffect(() => {
    jobStageRef.current = jobStage;
  }, [jobStage]);

  const applyAnalyzeResultToExam = useCallback(
    (result: any, markCompleted: boolean = true) => {
      const payload = result?.data;
      if (!payload) return;

      const typeAnalysis = payload.typeAnalysis || [];
      const inferredFullScore =
        Array.isArray(typeAnalysis) && typeAnalysis.length > 0
          ? typeAnalysis.reduce((sum: number, item: any) => sum + (Number(item?.full || 0) || 0), 0)
          : 100;

      const mergedStudentInfo = {
        ...(studentInfo || {}),
        subject: payload.subject || (studentInfo as any)?.subject,
        examName: payload.examName || (studentInfo as any)?.examName,
      };

      const summaryData = {
        totalScore: payload.summary?.totalScore ?? 0,
        fullScore: inferredFullScore || 100,
        classAverage: (summary as any)?.classAverage ?? 79,
        classRank: payload.summary?.rank ?? 0,
        totalStudents: (summary as any)?.totalStudents ?? 50,
        scoreChange: (summary as any)?.scoreChange ?? 0,
        overview: payload.report?.forStudent?.overall ?? (summary as any)?.overview ?? '',
        strongestKnowledge: payload.summary?.strongestKnowledge ?? '',
        weakestKnowledge: payload.summary?.weakestKnowledge ?? '',
      };

      const practiceQuestions = buildPracticeQuestions(payload.practiceQuestions, payload.summary?.weakestKnowledge, mergedStudentInfo.subject);

      const forParentGuidance = payload.report?.forParent?.guidance;
      const habit = (() => {
        const g = forParentGuidance;
        if (!g) return [];
        if (Array.isArray(g)) return g;
        if (typeof g === 'string') return [g];
        if (typeof g === 'object') {
          if ((g as any)['习惯养成']) {
            return Array.isArray((g as any)['习惯养成']) ? (g as any)['习惯养成'] : [String((g as any)['习惯养成'])];
          }
          return Object.values(g as any).flat().map(String);
        }
        return [];
      })();

      const nextExam = {
        ...(data || {}),
        studentInfo: mergedStudentInfo,
        summary: summaryData,
        typeAnalysis,
        review: payload.review,
        studyMethods: payload.studyMethods,
        modules: {
          evaluation: [
            payload.report?.forStudent?.overall ?? '',
            ...(Array.isArray(payload.report?.forStudent?.problems) ? payload.report.forStudent.problems.slice(0, 1) : []),
          ]
            .filter(Boolean)
            .map((x: any) => {
              if (typeof x === 'string') return x;
              if (!x) return '';
              if (typeof x === 'object') {
                try {
                  return JSON.stringify(x);
                } catch {
                  return String(x);
                }
              }
              return String(x);
            })
            .filter(Boolean),
          problems: (Array.isArray(payload.report?.forStudent?.problems) ? payload.report.forStudent.problems : []).map((p: any, idx: number) =>
            parseProblemTextToKnowledgeItem(p, idx)
          ),
          keyErrors: [],
          advice: {
            content: (Array.isArray(payload.report?.forStudent?.advice) ? payload.report.forStudent.advice : [])
              .map((x: any) => {
                if (typeof x === 'string') return x;
                if (!x) return '';
                if (typeof x === 'object') {
                  try {
                    return JSON.stringify(x);
                  } catch {
                    return String(x);
                  }
                }
                return String(x);
              })
              .filter(Boolean),
            habit,
          },
        },
        paperAppearance: payload.paperAppearance,
        practiceQuestions,
        practicePaper: payload.practicePaper,
        acceptanceQuiz: payload.acceptanceQuiz,
        job: {
          id: jobId,
          status: markCompleted ? 'completed' : jobStatusRef.current || 'running',
          stage: markCompleted ? 'completed' : jobStageRef.current || 'extracting',
        },
      };

      if (onUpdateExam) onUpdateExam(nextExam);
    },
    [buildPracticeQuestions, data, jobId, onUpdateExam, parseProblemTextToKnowledgeItem, studentInfo, summary]
  );

  useEffect(() => {
    if (!jobId) return;

    let disposed = false;
    let pollingTimer: any = null;
    let es: EventSource | null = null;
    let sseRetryTimer: any = null;
    const lastEventIdRef = { current: 0 };
    const sseFailCountRef = { current: 0 };

    const setLoadingState = (status: string, stage: string, message?: string) => {
      setJobStatus(status);
      setJobStage(stage);
      setJobMessage(message || '');
      const running = status !== 'completed' && status !== 'failed' && status !== 'canceled';
      setShowIntro(running);
    };

    const pollOnce = async () => {
      try {
        const r = await fetch(`/api/analyze-images/jobs/${encodeURIComponent(jobId)}?includeResult=1`, {
          headers: {
            ...(trialAccessCode ? { 'x-access-code': trialAccessCode } : {}),
          },
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j?.success === false) {
          return;
        }
        const job = j?.job || {};
        setLoadingState(String(job?.status || ''), String(job?.stage || ''), String(job?.errorMessage || ''));
        const imgCount = Number(job?.imageCount || 0) || 0;
        const estSecs = Number(job?.estimateSeconds || 0) || 0;
        if (imgCount > 0) setJobImageCount(imgCount);
        if (estSecs > 0) setJobEstimateSeconds(estSecs);
        if (j?.partialResult && !j?.result) {
          applyAnalyzeResultToExam(j.partialResult, false);
        }
        if (j?.result) {
          applyAnalyzeResultToExam(j.result);
          setLoadingState('completed', 'completed', '');
        }
      } catch {}
    };

    const startPolling = () => {
      if (pollingTimer) return;
      setIsPolling(true);
      pollOnce();
      pollingTimer = setInterval(pollOnce, 2500);
    };

    const startSse = () => {
      if (es) return;
      const qs = new URLSearchParams();
      if (trialAccessCode) qs.set('accessCode', trialAccessCode);
      if (lastEventIdRef.current > 0) qs.set('lastEventId', String(lastEventIdRef.current));
      const query = qs.toString();
      const url = `/api/analyze-images/jobs/${encodeURIComponent(jobId)}/events${query ? `?${query}` : ''}`;
      es = new EventSource(url);
      es.onmessage = (evt) => {
        if (disposed) return;
        const le = Number((evt as any)?.lastEventId || 0) || 0;
        if (le > 0) lastEventIdRef.current = le;
        sseFailCountRef.current = 0;
        let payload: any = null;
        try {
          payload = JSON.parse(String(evt.data || ''));
        } catch {
          return;
        }
        const t = String(payload?.type || '');
        if (t === 'snapshot') {
          const job = payload?.job || {};
          setLoadingState(String(job?.status || ''), String(job?.stage || ''), String(job?.errorMessage || ''));
          const imgCount = Number(job?.imageCount || 0) || 0;
          const estSecs = Number(job?.estimateSeconds || 0) || 0;
          if (imgCount > 0) setJobImageCount(imgCount);
          if (estSecs > 0) setJobEstimateSeconds(estSecs);
          if (String(job?.status || '') === 'failed' && job?.errorMessage) {
            showToast(String(job.errorMessage));
          }
          return;
        }
        if (t === 'progress') {
          const status = jobStatusRef.current || 'running';
          setLoadingState(status, String(payload?.stage || ''), String(payload?.message || ''));
          return;
        }
        if (t === 'partial_result') {
          applyAnalyzeResultToExam(payload?.result, false);
          return;
        }
        if (t === 'result') {
          applyAnalyzeResultToExam(payload?.result);
          setLoadingState('completed', 'completed', '');
          try {
            es?.close();
          } catch {}
          return;
        }
        if (t === 'error') {
          setLoadingState('failed', 'failed', String(payload?.errorMessage || '分析失败'));
          showToast(String(payload?.errorMessage || '分析失败'));
          try {
            es?.close();
          } catch {}
          return;
        }
      };
      es.onerror = () => {
        if (disposed) return;
        try {
          es?.close();
        } catch {}
        es = null;
        sseFailCountRef.current += 1;
        if (sseFailCountRef.current >= 3) {
          startPolling();
          return;
        }
        if (sseRetryTimer) return;
        sseRetryTimer = setTimeout(() => {
          sseRetryTimer = null;
          if (disposed) return;
          startSse();
        }, 1000);
      };
    };

    setLoadingState(jobStatus || 'pending', jobStage || 'analyzing', jobMessage || '');
    startSse();

    return () => {
      disposed = true;
      if (pollingTimer) clearInterval(pollingTimer);
      if (sseRetryTimer) clearTimeout(sseRetryTimer);
      try {
        es?.close();
      } catch {}
    };
  }, [applyAnalyzeResultToExam, jobId, jobMessage, jobStage, jobStatus, trialAccessCode]);

  const cancelJob = async () => {
    if (!jobId) return;
    if (canceling) return;
    try {
      setCanceling(true);
      const r = await fetch(`/api/analyze-images/jobs/${encodeURIComponent(jobId)}/cancel`, {
        method: 'POST',
        headers: {
          ...(trialAccessCode ? { 'x-access-code': trialAccessCode } : {}),
        },
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.success === false) {
        throw new Error(j?.errorMessage || r.statusText || '取消失败');
      }
      showToast('已取消');
      setJobStatus('canceled');
      setJobStage('canceled');
      setShowIntro(false);
    } catch (e: any) {
      showToast(String(e?.message || '取消失败'));
    } finally {
      setCanceling(false);
    }
  };

  const retryJob = async () => {
    if (!jobId) return;
    if (retrying) return;
    try {
      setRetrying(true);
      const r = await fetch(`/api/analyze-images/jobs/${encodeURIComponent(jobId)}/retry?bypassCache=1`, {
        method: 'POST',
        headers: {
          ...(trialAccessCode ? { 'x-access-code': trialAccessCode } : {}),
        },
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.success === false) {
        throw new Error(j?.errorMessage || r.statusText || '重试失败');
      }
      setJobStatus('pending');
      setJobStage('queued');
      setJobMessage('');
      setShowIntro(true);
      showToast('已触发重试');
    } catch (e: any) {
      showToast(String(e?.message || '重试失败'));
    } finally {
      setRetrying(false);
    }
  };

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const practiceQuestions: string[] = data?.practiceQuestions || [];
  const review = data?.review;
  const acceptanceQuiz = data?.acceptanceQuiz;
  useEffect(() => {
    setGeneratedAcceptanceQuiz(null);
  }, [data?.id]);

  const effectiveAcceptanceQuiz = useMemo(() => {
    if (acceptanceQuiz?.questions?.length) return acceptanceQuiz;
    if (generatedAcceptanceQuiz?.questions?.length) return generatedAcceptanceQuiz;
    return null;
  }, [acceptanceQuiz, generatedAcceptanceQuiz]);

  const knownWeakPoints = useMemo(() => {
    if (!Array.isArray(modules?.problems)) return [];
    return modules.problems
      .map((p: any) => String(p?.name || '').trim())
      .filter(Boolean);
  }, [modules?.problems]);

  const defaultWeakPoint = useMemo(() => {
    const fromProblems = knownWeakPoints[0];
    if (fromProblems) return fromProblems;
    const fromSummary = String((summary as any)?.weakestKnowledge || '').trim();
    return fromSummary || '本次错因';
  }, [knownWeakPoints, summary]);

  const pickWeakPoint = (text: string) => {
    const t = String(text || '').trim();
    if (!t) return defaultWeakPoint;
    for (const wp of knownWeakPoints) {
      if (t.includes(wp)) return wp;
    }
    if (/(分式|方程|去分母|通分)/.test(t)) {
      const hit = knownWeakPoints.find((x: string) => /分式|方程/.test(x));
      return hit || defaultWeakPoint;
    }
    if (/(函数|读图|坐标|图像)/.test(t)) {
      const hit = knownWeakPoints.find((x: string) => /函数|读图|坐标|图像/.test(x));
      return hit || defaultWeakPoint;
    }
    if (/(时态|tense|语法)/i.test(t)) {
      const hit = knownWeakPoints.find((x: string) => /时态|语法/.test(x));
      return hit || defaultWeakPoint;
    }
    if (/(作文|立意|跑题|结构)/.test(t)) {
      const hit = knownWeakPoints.find((x: string) => /作文|写作/.test(x));
      return hit || defaultWeakPoint;
    }
    return defaultWeakPoint;
  };

  const persistPlanProgress = (next: {
    done?: Record<string, boolean>;
    reflections?: Record<string, string>;
    customTasks?: { id: string; day: number; text: string; weakPoint: string }[];
  }) => {
    const prev = (data as any)?.planProgress || {};
    const merged = {
      done: next.done ?? prev.done ?? {},
      reflections: next.reflections ?? prev.reflections ?? {},
      customTasks: next.customTasks ?? prev.customTasks ?? [],
    };
    if (onUpdateExam) {
      onUpdateExam({
        ...(data || {}),
        planProgress: merged,
      });
    }
  };

  const initialPlanProgress = (data as any)?.planProgress || {};
  const [planDone, setPlanDone] = useState<Record<string, boolean>>(initialPlanProgress.done || {});
  const [planReflections, setPlanReflections] = useState<Record<string, string>>(initialPlanProgress.reflections || {});
  const [customPlanTasks, setCustomPlanTasks] = useState<{ id: string; day: number; text: string; weakPoint: string }[]>(
    Array.isArray(initialPlanProgress.customTasks) ? initialPlanProgress.customTasks : []
  );

  useEffect(() => {
    setPlanDone(initialPlanProgress.done || {});
    setPlanReflections(initialPlanProgress.reflections || {});
    setCustomPlanTasks(Array.isArray(initialPlanProgress.customTasks) ? initialPlanProgress.customTasks : []);
  }, [data?.id, initialPlanProgress.done, initialPlanProgress.reflections, initialPlanProgress.customTasks]);

  useEffect(() => {
    setShowIntro(true);
    const t = setTimeout(() => setShowIntro(false), 900);
    return () => clearTimeout(t);
  }, [data?.id]);

  useEffect(() => {
    const ar = (data as any)?.acceptanceResult;
    if (!ar || ar.passed !== false) return;
    const handledAt = String(ar?.handledAt || '').trim();
    if (handledAt) return;

    const weakPoint = defaultWeakPoint;
    const ts = String(ar?.timestamp || new Date().toISOString());
    const nextAcceptanceResult = {
      ...(ar || {}),
      passed: false,
      timestamp: ts,
      handledAt: new Date().toISOString(),
    };

    const id = `retrain-${ts}`;
    const already = customPlanTasks.some((t) => String((t as any)?.id || '') === id);
    const nextCustomTasks = already
      ? customPlanTasks
      : [{ id, day: 1, weakPoint, text: `二次训练：${weakPoint} 专项 3 题（验收未通过）` }, ...customPlanTasks];

    const nextPlanProgress = {
      done: planDone,
      reflections: planReflections,
      customTasks: nextCustomTasks,
    };

    setCustomPlanTasks(nextCustomTasks);

    if (onUpdateExam) {
      onUpdateExam({
        ...(data || {}),
        acceptanceResult: nextAcceptanceResult,
        planProgress: nextPlanProgress,
      });
    }

    generatePracticeForWeakPoint(
      weakPoint,
      `验收未通过（正确 ${Number(ar?.correctCount ?? ar?.passedCount ?? 0)}/${Number(ar?.total ?? 0)}）`,
      { acceptanceResult: nextAcceptanceResult, planProgress: nextPlanProgress }
    );
  }, [data?.id, data?.acceptanceResult, defaultWeakPoint, customPlanTasks, planDone, planReflections, onUpdateExam]);

  const studyCoach = (() => {
    const backend = data?.studyMethods;
    const normalizeList = (v: any, limit: number) => {
      if (!Array.isArray(v)) return [];
      return v
        .map((x) => String(x || '').trim())
        .filter(Boolean)
        .slice(0, limit);
    };

    if (backend && typeof backend === 'object') {
      const methods = normalizeList((backend as any).methods, 6);
      const weekPlan = normalizeList((backend as any).weekPlan, 7);
      if (methods.length > 0) {
        return { methods, weekPlan };
      }
    }

    const subject = String(studentInfo.subject || '').trim();
    const grade = String(studentInfo.grade || '').trim();
    const text = [
      ...(Array.isArray(modules?.problems) ? modules.problems.map((p: any) => `${p?.name || ''} ${p?.desc || ''}`) : []),
      ...(Array.isArray(modules?.advice?.content) ? modules.advice.content : []),
      ...(Array.isArray(modules?.advice?.habit) ? modules.advice.habit : []),
    ]
      .map((s) => String(s || '').trim())
      .filter(Boolean)
      .join(' ');

    const methods: string[] = [];
    const weekPlan: string[] = [];

    const pushUnique = (list: string[], item: string) => {
      const v = String(item || '').trim();
      if (!v) return;
      if (!list.includes(v)) list.push(v);
    };

    pushUnique(methods, '效率优先：每次学习先保证 25 分钟全程专注，再休息 5 分钟，比“走神一小时”更有效。');
    pushUnique(methods, '错题本不求精美：每题只写“错因一句话 + 正确关键一步 + 下次检查点”，能复盘才有价值。');

    if (subject.includes('数学') || subject.toLowerCase().includes('math')) {
      if (/(分式|方程|去分母|通分)/.test(text)) {
        pushUnique(methods, '分式方程三步清单：同乘最小公倍式→去分母→验根；每题按清单逐行写全。');
      }
      if (/(函数|读图|坐标|图像)/.test(text)) {
        pushUnique(methods, '读图三步：先写横纵轴含义→标关键点/交点→代入或回代验证，避免“看错点”。');
      }
      pushUnique(methods, '举一反三：同一错因连续做 3 道同类题，直到步骤零失误再换题型。');

      weekPlan.push('第 1–2 天：吃透课本概念/公式（知其然也知其所以然）+ 4 道基础题。');
      weekPlan.push('第 3–4 天：围绕本次错因做变式题（每个错因 3 题），做完立刻复盘。');
      weekPlan.push('第 5–6 天：限时训练一套小卷，重点练“时间分配 + 检查习惯”。');
      weekPlan.push('第 7 天：回看错题本 + 做一次验收小测，确保同类题稳定全对。');
    } else if (subject.includes('英语') || subject.toLowerCase().includes('english')) {
      pushUnique(methods, '词汇记忆三原则：循环模糊记忆（1/3/7 天复习）+ 相似词对比记 + 词根词缀联想记。');
      pushUnique(methods, '阅读策略：先整体抓主旨，再回到题目定位细节；把题干关键词圈出来再找原文。');
      if (/(时态|tense)/i.test(text)) {
        pushUnique(methods, '时态专项：每天 10–15 题“时间状语→时态”选择题，错题写入错误档案。');
      }

      weekPlan.push('每天 30 分钟：10 分钟词汇（对比/词根）+ 10 分钟语法/完形 + 10 分钟阅读。');
      weekPlan.push('每次做完：用 2 分钟写下“这道题错在哪里/下次怎么避免”。');
    } else if (subject.includes('语文') || subject.toLowerCase().includes('chinese')) {
      pushUnique(methods, '阅读两遍：第一遍整体理解，第二遍勾画关键词句；答题尽量用学科术语。');
      pushUnique(methods, '概括题“四要素”：人物/事件/结果/主题 先写一句话，再精简成标准答案。');
      if (/(作文|立意|跑题|结构)/.test(text)) {
        pushUnique(methods, '写作四步：审题圈关键词→列提纲→选素材→结尾用名言/观点回扣主题。');
        pushUnique(methods, '素材积累：每周收集 3 条新闻/名言/典故，分类入库，写作时直接调用。');
      }

      weekPlan.push('第 1–2 天：阅读训练（先主旨后细节）+ 2 道概括题按“四要素”作答。');
      weekPlan.push('第 3–4 天：基础积累（字词/成语/病句）各 10 分钟 + 错题复盘。');
      weekPlan.push('第 5–7 天：微写作 3 次（每次 150–200 字），先提纲后成文再自改。');
    } else {
      weekPlan.push(`${grade || '本周'}：围绕“本次错因”做 3 次针对训练，每次训练后写 1 句复盘。`);
    }

    return { methods: methods.slice(0, 6), weekPlan };
  })();

  const methodTasks = useMemo(() => {
    const list = (studyCoach.methods || []).map((text: string, i: number) => {
      const weakPoint = pickWeakPoint(text);
      return {
        id: `m-${i}`,
        text,
        weakPoint,
        tagLabel: `${weakPoint}专项`,
        minutes: isPlanCompressed ? 10 : 15,
      };
    });
    return isPlanCompressed ? list.slice(0, 2) : list;
  }, [studyCoach.methods, knownWeakPoints, defaultWeakPoint, isPlanCompressed]);

  const dayPlan = useMemo(() => {
    const raw = Array.isArray(studyCoach.weekPlan) ? studyCoach.weekPlan : [];
    const list: { day: number; text: string; weakPoint: string; minutes: number }[] = [];
    for (let day = 1; day <= 7; day += 1) {
      const baseText = String(raw[day - 1] || '').trim();
      const text = isPlanCompressed
        ? day === 7
          ? `第 7 天：20 分钟验收小测（3 题）+ 复盘一句话`
          : `第 ${day} 天：20 分钟 ${defaultWeakPoint} 专项 3 题 + 复盘一句话`
        : baseText ||
          (day === 7
            ? `第 7 天：验收小测 + 结果归档到错题巩固本（复盘 1 句）`
            : `第 ${day} 天：${defaultWeakPoint} 专项 3 题（20 分钟）+ 复盘一句话`);
      const weakPoint = pickWeakPoint(text);
      const minutes = isPlanCompressed ? 20 : day === 7 ? 15 : 20;
      list.push({ day, text, weakPoint, minutes });
    }
    return list;
  }, [studyCoach.weekPlan, defaultWeakPoint, knownWeakPoints, isPlanCompressed]);

  const customByDay = useMemo(() => {
    const map = new Map<number, { id: string; text: string; weakPoint: string }[]>();
    for (const t of customPlanTasks) {
      if (!t || typeof t !== 'object') continue;
      const day = Number((t as any).day || 0);
      if (!day || day < 1 || day > 7) continue;
      const arr = map.get(day) || [];
      arr.push({ id: String((t as any).id || ''), text: String((t as any).text || ''), weakPoint: String((t as any).weakPoint || defaultWeakPoint) });
      map.set(day, arr);
    }
    return map;
  }, [customPlanTasks, defaultWeakPoint]);

  const stageState = useMemo(() => {
    const diagnosisDone = Array.isArray(modules?.problems) && modules.problems.length > 0;
    const trainingDone = !!(data?.practicePaper?.sections && data.practicePaper.sections.length > 0);
    const acceptanceDone = !!data?.acceptanceResult?.passed;
    return { diagnosisDone, trainingDone, acceptanceDone };
  }, [modules?.problems, data?.practicePaper, data?.acceptanceResult]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const generatePracticeForWeakPoint = async (
    weakPoint: string,
    wrongQuestion?: string,
    dataPatch?: any,
    opts?: { openPractice?: boolean; toastOnSuccess?: boolean }
  ) => {
    const wp = String(weakPoint || '').trim();
    if (!wp) return;

    try {
      setGeneratingWeakPoint(wp);
      const res = await fetch('/api/generate-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weakPoint: wp,
          wrongQuestion: wrongQuestion || '',
          subject: studentInfo.subject,
          grade: studentInfo.grade,
          provider: llmConfig.provider,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.errorMessage || res.statusText || '生成失败');
      }

      const payload = json?.data ?? json;
      const sectionName = String(payload?.sectionName || `针对性强化训练：${wp}`).trim();
      const questionsRaw = Array.isArray(payload?.questions) ? payload.questions : [];
      const questions = questionsRaw
        .map((q: any, idx: number) => ({
          no: Number(q?.no || idx + 1),
          content: String(q?.content || '').trim(),
          hints: Array.isArray(q?.hints) ? q.hints.map((h: any) => String(h || '').trim()).filter(Boolean) : [],
        }))
        .filter((q: any) => q.content);

      const prevPaper = (data as any)?.practicePaper;
      const nextSections = Array.isArray(prevPaper?.sections) ? [...prevPaper.sections] : [];
      const existingIdx = nextSections.findIndex((s: any) => String(s?.name || '').trim() === sectionName);
      const nextSection = { name: sectionName, questions };
      if (existingIdx >= 0) nextSections[existingIdx] = nextSection;
      else nextSections.unshift(nextSection);

      const nextPaper = {
        title: String(prevPaper?.title || '针对性巩固练习卷'),
        sections: nextSections,
      };

      const base = {
        ...(data || {}),
        ...(dataPatch || {}),
      };
      const nextData = {
        ...base,
        practicePaper: nextPaper,
        practiceFocusSectionName: sectionName,
      };

      if (onUpdateExam) onUpdateExam(nextData);
      if (opts?.openPractice !== false && onOpenPractice) onOpenPractice();
      if (opts?.toastOnSuccess !== false) showToast(`已生成“${wp}”专项 3 题`);
      return { sectionName, questions };
    } catch (err: any) {
      showToast(`生成失败：${err?.message || '未知错误'}`);
      return null;
    } finally {
      setGeneratingWeakPoint(null);
    }
  };

  const generateAcceptanceQuizForWeakPoint = async (weakPoint: string) => {
    const wp = String(weakPoint || '').trim();
    if (!wp) return null;

    const res = await fetch('/api/generate-practice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weakPoint: wp,
        wrongQuestion: '验收小测',
        subject: studentInfo.subject,
        grade: studentInfo.grade,
        provider: llmConfig.provider,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.success === false) {
      throw new Error(json?.errorMessage || res.statusText || '生成失败');
    }

    const payload = json?.data ?? json;
    const questionsRaw = Array.isArray(payload?.questions) ? payload.questions : [];
    const questions = questionsRaw
      .map((q: any, idx: number) => ({
        no: Number(q?.no || idx + 1),
        content: String(q?.content || '').trim(),
        hints: Array.isArray(q?.hints) ? q.hints.map((h: any) => String(h || '').trim()).filter(Boolean) : [],
      }))
      .filter((q: any) => q.content);

    const quiz = {
      title: `验收小测：${wp}`,
      passRule: '正确率≥60%',
      questions,
    };

    setGeneratedAcceptanceQuiz(quiz);
    if (onUpdateExam) {
      onUpdateExam({
        ...(data || {}),
        acceptanceQuiz: quiz,
      });
    }

    return quiz;
  };

  const handleEnterAcceptance = async () => {
    if (effectiveAcceptanceQuiz?.questions?.length) {
      setIsAcceptanceOpen(true);
      return;
    }
    if (generatingAcceptance) return;

    setGeneratingAcceptance(true);
    showToast('正在生成验收小测，请稍候...');
    try {
      const quiz = await generateAcceptanceQuizForWeakPoint(defaultWeakPoint);
      if (quiz?.questions?.length) {
        showToast('验收小测已生成');
        setIsAcceptanceOpen(true);
      } else {
        showToast('验收小测生成失败');
      }
    } catch (e: any) {
      showToast(`验收小测生成失败：${String(e?.message || '未知错误')}`);
    } finally {
      setGeneratingAcceptance(false);
    }
  };

  const copyToClipboard = (text: string, okMsg: string, failMsg: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => showToast(okMsg))
        .catch(() => showToast(failMsg));
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
      showToast(okMsg);
    } catch {
      showToast(failMsg);
    }
    document.body.removeChild(textarea);
  };

  const buildParentScript = () => {
    const name = String(studentInfo?.name || '孩子');
    const subject = String(studentInfo?.subject || '本学科');
    const examName = String(studentInfo?.examName || '本次考试');
    const totalScore = Number(summary?.totalScore ?? 0);
    const fullScore = Number(summary?.fullScore ?? 0);
    const scoreLine = fullScore > 0 ? `${totalScore}/${fullScore}` : String(totalScore || '');
    const strongest = String(summary?.strongestKnowledge || '').trim();
    const weakest = String(summary?.weakestKnowledge || '').trim();

    const rank = Number(summary?.classRank ?? 0);
    const totalStudents = Number(summary?.totalStudents ?? 0);
    const classAverage = Number(summary?.classAverage ?? 0);
    const scoreMetaParts = [
      scoreLine ? `分数 ${scoreLine}` : '',
      classAverage ? `班均 ${classAverage}` : '',
      rank && totalStudents ? `排名 ${rank}/${totalStudents}` : '',
    ].filter(Boolean);
    const scoreMeta = scoreMetaParts.length ? `（${scoreMetaParts.join('，')}）` : '';

    const coreProblems = Array.isArray(modules?.problems) ? modules.problems.slice(0, 3) : [];
    const focusBlocks = coreProblems
      .map((p: any) => {
        const detail = parseProblemDetail(p);
        const wp = String(p?.name || '').trim();
        const reason = String(detail?.reason || '').trim();
        const fix = String(detail?.fix || '').trim();
        const qno = String(detail?.questionNo || '').trim();
        const score = String(detail?.score || '').trim();
        const headParts = [qno ? `题号 ${qno}` : '', score ? `得分 ${score}` : ''].filter(Boolean);
        const head = headParts.length ? `（${headParts.join('，')}）` : '';
        const line = [
          wp ? `- ${wp}${head}` : '-',
          reason ? `：${reason}` : '',
          fix ? `；最短改法：${fix}` : '',
        ].join('');
        return line === '-' ? '' : line;
      })
      .filter(Boolean);

    const praise = strongest ? `这次${subject}里“${strongest}”表现比较稳，值得表扬。` : `这次${subject}整体完成度不错，值得表扬。`;
    const focus = weakest ? `接下来我们把“${weakest}”作为重点。` : `接下来我们把本次错因作为重点。`;
    const problemsLine = focusBlocks.length > 0 ? ['本次主要需要针对性加强的点：', ...focusBlocks].join('\n') : '';

    const backendSummary = String((data as any)?.forParent?.summary || '').trim();
    const backendGuidance = String((data as any)?.forParent?.guidance || '').trim();

    return [
      `家长您好，${name}的《${examName}》${subject}成绩我已看过${scoreMeta}。`,
      praise,
      backendSummary,
      problemsLine,
      focus,
      backendGuidance,
      '本周执行一个轻量计划：每天 20 分钟做 3 道同类题 + 复盘一句话（错因 + 下次检查点）。',
      '我会同步观察完成情况与错题变化，有需要再和您沟通调整。',
    ]
      .map((s) => String(s || '').trim())
      .filter(Boolean)
      .join('\n');
  };

  const handleToggle20MinPlan = () => {
    const next = isPlanCompressed ? 'normal' : '20min';
    setPlanMode(next);
    if (onUpdateExam) onUpdateExam({ ...(data || {}), planMode: next });
    setActiveStage('training');
    scrollTo('plan-card');
    showToast(next === '20min' ? '已压缩为 20 分钟计划（7 天循环）' : '已恢复为完整计划');
  };

  const handleGenerateParentScript = () => {
    const text = buildParentScript();
    copyToClipboard(text, '已复制家长沟通话术', '复制失败，请手动选中文本复制');
  };

  const handlePrintWeeklyNotebook = () => {
    let printWindow: Window | null = null;
    try {
      printWindow = window.open('', 'error-ledger-print', 'noopener,noreferrer');
      if (printWindow) {
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
        padding: 24px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, "Noto Sans", "PingFang SC", "Microsoft YaHei", sans-serif;
        color: #111827;
      }
      .muted { color: #64748b; font-size: 12px; }
      .title { font-size: 18px; font-weight: 700; margin: 0 0 8px 0; }
    </style>
  </head>
  <body>
    <div class="title">正在生成错题本…</div>
    <div class="muted">请稍候，生成完成后将自动弹出打印。</div>
  </body>
</html>`);
        printWindow.document.close();
        printWindow.focus();
      }
      sessionStorage.setItem('errorLedger:autoPrint', '1');
      sessionStorage.setItem('errorLedger:filter', 'unsolved');
      sessionStorage.setItem('errorLedger:printWindowName', 'error-ledger-print');
    } catch {}
    if (onOpenNotebook) {
      onOpenNotebook();
      return;
    }
    showToast('未找到错题本入口');
  };

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

  useEffect(() => {
    if (!isPreviewOpen) return;
    setPreviewPosition({ x: 0, y: 0 });
    setIsPreviewDragging(false);
    previewDragRef.current = null;
  }, [isPreviewOpen]);

  const handlePreviewHeaderPointerDown = (e: React.PointerEvent) => {
    if (!isDesktop) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsPreviewDragging(true);
    previewDragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: previewPosition.x,
      originY: previewPosition.y,
    };
  };

  const handlePreviewHeaderPointerMove = (e: React.PointerEvent) => {
    if (!isDesktop) return;
    const d = previewDragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    setPreviewPosition({ x: d.originX + (e.clientX - d.startX), y: d.originY + (e.clientY - d.startY) });
  };

  const handlePreviewHeaderPointerUp = (e: React.PointerEvent) => {
    const d = previewDragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    previewDragRef.current = null;
    setIsPreviewDragging(false);
  };

  const handleAddToPlan = (e: React.MouseEvent, item: any) => {
    const btn = e.currentTarget.getBoundingClientRect();

    const targetEl =
      (document.querySelector('.right-inspector .task-list') as HTMLElement | null) ||
      (document.querySelector('.context-bar .stage-progress') as HTMLElement | null);

    const target = targetEl?.getBoundingClientRect();
    const startX = btn.left + btn.width / 2;
    const startY = btn.top + btn.height / 2;
    const endX = target ? target.left + target.width / 2 : window.innerWidth - 40;
    const endY = target ? target.top + target.height / 2 : 40;

    const clone = document.createElement('div');
    clone.innerText = '📅';
    clone.style.position = 'fixed';
    clone.style.left = `${startX}px`;
    clone.style.top = `${startY}px`;
    clone.style.fontSize = '24px';
    clone.style.zIndex = '9999';
    clone.style.setProperty('--fly-x', `${endX - startX}px`);
    clone.style.setProperty('--fly-y', `${endY - startY}px`);
    clone.className = 'fly-animation';
    document.body.appendChild(clone);

    setTimeout(() => {
      document.body.removeChild(clone);
      const weakPoint = String(item?.name || defaultWeakPoint).trim();
      const id = `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      const day = 1;
      const next = [{ id, day, weakPoint, text: `Day ${day}：${weakPoint} 专项 3 题（20 分钟）+ 复盘一句话` }, ...customPlanTasks];
      setCustomPlanTasks(next);
      persistPlanProgress({ done: planDone, reflections: planReflections, customTasks: next });
      showToast(`已将“${weakPoint}”加入本周计划`);
    }, 800);
  };

  // V2: Focus Mode State
  const [focusErrorId, setFocusErrorId] = useState<string | null>(null);
  
  const handleTrainError = (item: any) => {
    const weakPoint = String(item?.name || '').trim();
    const wrongQuestion = String(item?.desc || '').trim();
    generatePracticeForWeakPoint(weakPoint || defaultWeakPoint, wrongQuestion);
  };

  // Inspector Drag & Collapse
  const [inspectorPosition, setInspectorPosition] = useState({ x: 0, y: 0 });
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(false);
  const [isInspectorDragging, setIsInspectorDragging] = useState(false);

  // V3: Left Sidebar State (Popup Style)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarSide, setSidebarSide] = useState<'left' | 'right'>('left');

  const inspectorDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const handleInspectorPointerDown = (e: React.PointerEvent) => {
    if (!isDesktop) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsInspectorDragging(true);
    inspectorDragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: inspectorPosition.x,
      originY: inspectorPosition.y,
    };
  };

  const handleInspectorPointerMove = (e: React.PointerEvent) => {
    if (!isDesktop) return;
    const d = inspectorDragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    setInspectorPosition({ x: d.originX + (e.clientX - d.startX), y: d.originY + (e.clientY - d.startY) });
  };

  const handleInspectorPointerUp = (e: React.PointerEvent) => {
    const d = inspectorDragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    inspectorDragRef.current = null;
    setIsInspectorDragging(false);
  };

  return (
    <div className="report-layout" style={reportStyle}>
      {/* 1. Desktop Sidebar (Popup Style) */}
      <div 
        className={`sidebar-trigger ${sidebarSide} mobile-hidden`}
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        title="打开菜单"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </div>

      {isSidebarOpen && (
        <div className={`sidebar-popup ${sidebarSide} mobile-hidden`}>
          <div className="sidebar-popup-content">
            <button className="dock-btn rect-btn" onClick={onBack} title="返回首页">
              <ArrowLeft size={20} />
              <span>返回</span>
            </button>
            
            <div className="sidebar-divider" />

            <button className="dock-btn rect-btn" onClick={onOpenNotebook} title="错题本">
              <BookOpen size={20} />
              <span>错题本</span>
            </button>

            <div className="sidebar-divider" />

            <button className="dock-btn rect-btn" onClick={onOpenDashboard} title="家长驾驶舱">
              <span style={{ fontSize: 16 }}>🧭</span>
              <span>家长驾驶舱</span>
            </button>

            <div className="sidebar-divider" />

            <button className="dock-btn rect-btn" onClick={() => { setIsSidebarOpen(false); setIsStudyMethodsOpen(true); }} title="学习方法">
              <BookOpen size={20} />
              <span>学习方法</span>
            </button>

            <div className="sidebar-divider" />

            <button 
              className="dock-btn rect-btn" 
              onClick={() => {
                setSidebarSide(sidebarSide === 'left' ? 'right' : 'left');
                setIsSidebarOpen(false); // Close after switch to avoid confusion or keep open? Let's keep open but it will move.
                setTimeout(() => setIsSidebarOpen(true), 50);
              }} 
              title="切换位置"
            >
              <ArrowRightLeft size={20} />
              <span>切换位置</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Top Context Bar (Command Center Style) */}
      <div className="context-bar">
        <div className="context-left">
          <div className="context-back">
            <button className="settings-btn" onClick={onBack} title="返回">
              <ArrowLeft size={20} color="#64748b" />
            </button>
          </div>
          <div className="context-info">
            <div className="context-title">{studentInfo.subject}分析报告</div>
            <div className="context-meta">
              <span>{studentInfo.name}</span>
              <span>•</span>
              <span>{studentInfo.examName}</span>
            </div>
          </div>
        </div>
        <div className="stage-progress">
          <button
            className={`stage-step ${activeStage === 'diagnosis' ? 'active' : ''} ${stageState.diagnosisDone ? 'done' : ''}`}
            onClick={() => {
              setActiveStage('diagnosis');
              scrollTo('problems-card');
            }}
          >
            诊断
          </button>
          <button
            className={`stage-step ${activeStage === 'training' ? 'active' : ''} ${stageState.trainingDone ? 'done' : ''}`}
            onClick={() => {
              setActiveStage('training');
              scrollTo('plan-card');
            }}
          >
            训练
          </button>
          <button
            className={`stage-step ${activeStage === 'acceptance' ? 'active' : ''} ${stageState.acceptanceDone ? 'done' : ''}`}
            onClick={() => {
              setActiveStage('acceptance');
              scrollTo('practice-preview-section');
              handleEnterAcceptance();
            }}
          >
            验收
          </button>
        </div>
        <div className="context-actions control-panel">
          {onOpenDashboard && (
            <button className="settings-btn" onClick={onOpenDashboard} title="家长驾驶舱">
              <LayoutDashboard size={20} color="#64748b" />
            </button>
          )}
          {onOpenNotebook && (
            <button className="settings-btn" onClick={onOpenNotebook} title="错题本">
              <BookOpen size={20} color="#64748b" />
            </button>
          )}
          <button 
            className={`settings-btn ${!isInspectorCollapsed ? 'active' : ''}`} 
            onClick={() => setIsInspectorCollapsed(!isInspectorCollapsed)} 
            title={isInspectorCollapsed ? '展开今日任务' : '关闭任务栏'}
            data-tooltip="今日任务"
          >
            <Calendar size={20} color="#64748b" />
          </button>
          <button className="settings-btn" onClick={() => setIsStudyMethodsOpen(true)} title="学习方法">
            <GraduationCap size={20} color="#64748b" />
          </button>
          <button className="settings-btn" onClick={() => setIsPreviewOpen(true)} title="导出/预览">
            <Download size={20} color="#64748b" />
          </button>
          <button className="settings-btn" onClick={() => setIsSettingsOpen(true)} title="设置">
            <Settings size={20} color="#64748b" />
          </button>
        </div>
      </div>

      {showIntro && (
        <div className="scan-overlay">
          <div className="scan-line"></div>
        </div>
      )}

      {jobId && jobStatus !== 'completed' && jobStatus !== 'failed' && jobStatus !== 'canceled' && (
        <div
          style={{
            position: 'fixed',
            top: 12,
            left: 12,
            right: 12,
            zIndex: 200,
            background: 'rgba(255,255,255,0.92)',
            border: '1px solid rgba(148,163,184,0.55)',
            borderRadius: 12,
            padding: '10px 12px',
            boxShadow: '0 10px 20px rgba(0,0,0,0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>
              {jobStage === 'queued'
                ? '排队中…'
                : jobStage === 'extracting'
                  ? '正在提取关键信息…'
                  : jobStage === 'diagnosing'
                    ? '正在生成核心结论…'
                    : jobStage === 'practicing'
                      ? '正在生成训练与验收…'
                      : jobStage === 'merging'
                        ? '正在整合报告…'
                        : '正在分析中…'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {jobMessage ||
                [
                  jobImageCount ? `共 ${jobImageCount} 页` : '',
                  estimateSeconds ? `预计 ${Math.max(30, Math.round(estimateSeconds / 10) * 10)} 秒左右` : '',
                  isPolling ? '连接不稳定，已切到轮询' : '',
                ]
                  .filter(Boolean)
                  .join(' · ') ||
                '请保持页面打开，完成后会自动刷新内容'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="op-btn-secondary"
              onClick={() => {
                try {
                  navigator.clipboard?.writeText(jobId);
                  showToast('已复制 jobId');
                } catch {
                  showToast(`jobId：${jobId}`);
                }
              }}
            >
              复制jobId
            </button>
            <button className="op-btn-secondary" onClick={cancelJob} disabled={canceling}>
              {canceling ? '取消中…' : '取消'}
            </button>
          </div>
        </div>
      )}

      {jobId && (jobStatus === 'failed' || jobStatus === 'canceled') && (
        <div
          style={{
            position: 'fixed',
            top: 12,
            left: 12,
            right: 12,
            zIndex: 200,
            background: 'rgba(255,255,255,0.92)',
            border: '1px solid rgba(239,68,68,0.35)',
            borderRadius: 12,
            padding: '10px 12px',
            boxShadow: '0 10px 20px rgba(0,0,0,0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 13, color: '#991b1b', fontWeight: 700 }}>{jobStatus === 'canceled' ? '已取消' : '分析失败'}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{jobMessage || '可尝试重试，或复制 jobId 反馈排查'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="op-btn-secondary"
              onClick={() => {
                try {
                  navigator.clipboard?.writeText(jobId);
                  showToast('已复制 jobId');
                } catch {
                  showToast(`jobId：${jobId}`);
                }
              }}
            >
              复制jobId
            </button>
            <button className="op-btn-primary" onClick={retryJob} disabled={retrying}>
              {retrying ? '重试中…' : '重试'}
            </button>
          </div>
        </div>
      )}

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        studentInfo={studentInfo}
        onUpdateStudentInfo={() => {}} 
        trialAccessCode={trialAccessCode}
        onUpdateTrialAccessCode={setTrialAccessCode}
        llmConfig={llmConfig}
        onUpdateLlmConfig={setLlmConfig}
      />

      <StudyMethodsModal
        isOpen={isStudyMethodsOpen}
        onClose={() => setIsStudyMethodsOpen(false)}
        methods={studyCoach.methods}
        onSyncToReport={(methods) => {
          const next = {
            ...(data || {}),
            studyMethods: {
              ...((data as any)?.studyMethods || {}),
              methods,
              weekPlan: Array.isArray(((data as any)?.studyMethods || {})?.weekPlan) ? ((data as any)?.studyMethods || {})?.weekPlan : studyCoach.weekPlan,
            },
          };
          if (onUpdateExam) onUpdateExam(next);
          showToast('已同步学习方法到试卷分析报告');
        }}
      />

      <div className={`report-content ${showIntro ? 'intro' : ''}`}>
          
          {/* Card 1: Overview (Dashboard) */}
          <div className="cmd-card" id="overview-card">
            <div className="cmd-card-header">
              <div className="cmd-card-title">
                <span>📊</span> 成绩概览
              </div>
              <div className="cmd-card-badge">{summary.classRank}/{summary.totalStudents}名</div>
            </div>
            
            <div className="score-summary-card" style={{ boxShadow: 'none', padding: 0, marginBottom: 0, background: 'transparent', position: 'relative' }}>
                {data.acceptanceResult?.passed && (
                  <div className="verified-stamp"></div>
                )}
                <div className="score-main" style={{ fontSize: 40 }}>
                    {summary.totalScore}
                    <span className="score-full" style={{ fontSize: 14 }}> /{summary.fullScore}</span>
                </div>
                <div className="score-stats-row" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 12 }}>
                    <div className="stat-item">
                        <span className="stat-value">{summary.classAverage}</span>
                        <span className="stat-label">班均</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value" style={{color: summary.scoreChange >= 0 ? '#16a34a' : '#dc2626'}}>
                            {summary.scoreChange >= 0 ? `+${summary.scoreChange}` : summary.scoreChange}
                        </span>
                        <span className="stat-label">进退</span>
                    </div>
                </div>
                <div className="score-eval-text" style={{ fontSize: 13, background: 'rgba(255,255,255,0.5)', border: '1px solid #e2e8f0' }}>
                    <LatexRenderer text={String(summary.overview || '')} />
                </div>
            </div>
          </div>

          {/* Card 2: Error Analysis (Structured 5-row) */}
          <div className="cmd-card" id="problems-card">
            <div className="cmd-card-header">
              <div className="cmd-card-title">
                <span>🎯</span> 核心错因
              </div>
              <div className="cmd-card-badge">{modules.problems.length}个问题</div>
            </div>
            
            <div className="error-card-stack">
              {modules.problems.map((item: any, i: number) => {
                 const detail = parseProblemDetail(item);
                 const focusId = `problem-${i}`;
                 const expanded = focusErrorId === focusId;
                 return (
                  <div
                    key={i}
                    className="error-card-item"
                    onClick={() => setFocusErrorId(expanded ? null : focusId)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: '#1e293b' }}>
                      {item.name} <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>| 扣分率 {item.rate}</span>
                    </div>

                    {(detail.questionNo || detail.score) && (
                      <div className="ec-row">
                        <div className="ec-label">定位</div>
                        <div className="ec-value">
                          {[detail.questionNo ? `题号 ${detail.questionNo}` : '', detail.score ? `得分 ${detail.score}` : '']
                            .filter(Boolean)
                            .join(' | ')}
                        </div>
                      </div>
                    )}
                    
                    {detail.reason && (
                      <div className="ec-row">
                        <div className="ec-label">错因</div>
                        <div className="ec-value highlight">
                          <LatexRenderer text={String(detail.reason || '')} />
                        </div>
                      </div>
                    )}
                    {detail.evidence && (
                      <div className="ec-row">
                        <div className="ec-label">证据</div>
                        <div className="ec-value">
                          <LatexRenderer text={String(detail.evidence || '')} />
                        </div>
                      </div>
                    )}
                    {detail.fix && (
                      <div className="ec-row">
                        <div className="ec-label">改法</div>
                        <div className="ec-value fix">
                          <LatexRenderer text={String(detail.fix || '')} />
                        </div>
                      </div>
                    )}

                    {expanded && String(item?.desc || '').trim() && (
                      <div className="ec-row" style={{ marginTop: 2 }}>
                        <div className="ec-label">详情</div>
                        <div className="ec-value">
                          <LatexRenderer text={String(item?.desc || '')} />
                        </div>
                      </div>
                    )}
                    
                    <div className="ec-actions">
                      <button 
                        className="ec-btn primary" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTrainError(item);
                        }}
                        disabled={!!generatingWeakPoint}
                      >
                        <span>⚡</span> 练一练
                      </button>
                      <button
                        className="ec-btn secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToPlan(e, item);
                        }}
                      >
                        <span>📅</span> 入计划
                      </button>
                    </div>
                  </div>
                 );
              })}
            </div>
          </div>

          {/* Card 3: Study Methods (Task-based) */}
          <div className="cmd-card" id="plan-card">
            <div className="cmd-card-header">
              <div className="cmd-card-title">
                <span>🚀</span> 提分计划
              </div>
              <div className="cmd-card-badge">7天循环</div>
            </div>
            
            <div className="task-list">
              {methodTasks.map((t) => (
                <div key={t.id} className="task-item">
                  <div
                    className={`task-checkbox ${planDone[t.id] ? 'checked' : ''}`}
                    onClick={() => {
                      const next = { ...planDone, [t.id]: !planDone[t.id] };
                      setPlanDone(next);
                      persistPlanProgress({ done: next, reflections: planReflections, customTasks: customPlanTasks });
                    }}
                    role="button"
                    tabIndex={0}
                  ></div>
                  <div className="task-content">
                    <div className="task-text">{t.text}</div>
                    <div
                      className="task-tag"
                      onClick={() => generatePracticeForWeakPoint(t.weakPoint, t.text)}
                      role="button"
                      tabIndex={0}
                      title="点击生成该错因专项 3 题"
                    >
                      {t.tagLabel}
                    </div>
                  </div>
                </div>
              ))}

              <div className="day-plan-grid">
                {dayPlan.map((d) => {
                  const extras = customByDay.get(d.day) || [];
                  const dayKey = `day-${d.day}`;
                  const reflection = planReflections[dayKey] || '';
                  return (
                    <div key={dayKey} className="day-card">
                      <div className="day-card-head">
                        <div className="day-title">Day {d.day}</div>
                        <div className="day-meta">
                          <span className="day-minutes">{d.minutes}min</span>
                          <span
                            className="task-tag"
                            onClick={() => generatePracticeForWeakPoint(d.weakPoint, d.text)}
                            role="button"
                            tabIndex={0}
                            title="点击生成该错因专项 3 题"
                          >
                            {`${d.weakPoint}专项`}
                          </span>
                        </div>
                      </div>

                      <div className="day-tasks">
                        <div className="task-item day-task">
                          <div
                            className={`task-checkbox ${planDone[`${dayKey}:base`] ? 'checked' : ''}`}
                            onClick={() => {
                              const id = `${dayKey}:base`;
                              const next = { ...planDone, [id]: !planDone[id] };
                              setPlanDone(next);
                              persistPlanProgress({ done: next, reflections: planReflections, customTasks: customPlanTasks });
                            }}
                            role="button"
                            tabIndex={0}
                          ></div>
                          <div className="task-content">
                            <div className="task-text">{d.text}</div>
                          </div>
                        </div>

                        {extras.map((x) => (
                          <div key={x.id} className="task-item day-task">
                            <div
                              className={`task-checkbox ${planDone[x.id] ? 'checked' : ''}`}
                              onClick={() => {
                                const next = { ...planDone, [x.id]: !planDone[x.id] };
                                setPlanDone(next);
                                persistPlanProgress({ done: next, reflections: planReflections, customTasks: customPlanTasks });
                              }}
                              role="button"
                              tabIndex={0}
                            ></div>
                            <div className="task-content">
                              <div className="task-text">{x.text}</div>
                              <div
                                className="task-tag"
                                onClick={() => generatePracticeForWeakPoint(x.weakPoint, x.text)}
                                role="button"
                                tabIndex={0}
                                title="点击生成该错因专项 3 题"
                              >
                                {`${x.weakPoint}专项`}
                              </div>
                            </div>
                          </div>
                        ))}

                        <div className="day-reflection">
                          <div className="reflection-label">复盘一句话</div>
                          <input
                            className="reflection-input"
                            value={reflection}
                            placeholder="今天学到了什么？下次怎么避免？"
                            onChange={(e) => {
                              const next = { ...planReflections, [dayKey]: e.target.value };
                              setPlanReflections(next);
                              persistPlanProgress({ done: planDone, reflections: next, customTasks: customPlanTasks });
                            }}
                          />
                        </div>

                        {d.day === 7 && (
                          <button
                            className="op-btn-primary"
                            onClick={handleEnterAcceptance}
                            style={{ width: '100%', justifyContent: 'center', height: 40, background: '#16a34a' }}
                            disabled={generatingAcceptance}
                            title={
                              generatingAcceptance
                                ? '正在生成验收小测'
                                : effectiveAcceptanceQuiz?.questions?.length
                                  ? ''
                                  : '点击生成验收小测'
                            }
                          >
                            {generatingAcceptance ? '正在生成…' : '进入验收'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Card 4: Practice & Acceptance */}
          <div className="cmd-card" id="practice-preview-section">
            <div className="cmd-card-header">
              <div className="cmd-card-title">
                <span>📝</span> 巩固与验收
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>已生成 {data?.practicePaper?.sections?.reduce((a:any,b:any)=>a+b.questions.length,0) || 0} 道针对性练习题</div>
                <button 
                  className="op-btn-secondary" 
                  onClick={onOpenPractice}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  预览练习卷
                </button>
              </div>

              <button
                className="op-btn-primary"
                onClick={handleEnterAcceptance}
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={generatingAcceptance}
                title={generatingAcceptance ? '正在生成验收小测' : ''}
              >
                {effectiveAcceptanceQuiz?.questions?.length ? '开始验收小测' : generatingAcceptance ? '正在生成验收小测…' : '生成并开始验收'}
              </button>
            </div>
          </div>

          <div style={{height: 80}}></div>
      </div>

      {/* Desktop Right Inspector (Visible on desktop) */}
      {!isInspectorCollapsed && (
        <div 
          className="right-inspector"
          style={{
            transform: isDesktop ? `translate3d(${inspectorPosition.x}px, ${inspectorPosition.y}px, 0)` : undefined,
            transition: isInspectorDragging ? 'none' : undefined,
          }}
        >
           {/* Drag Handle */}
           <div 
             className="inspector-drag-handle"
             onPointerDown={handleInspectorPointerDown}
             onPointerMove={handleInspectorPointerMove}
             onPointerUp={handleInspectorPointerUp}
             onPointerCancel={handleInspectorPointerUp}
             style={{
               position: 'absolute', top: 0, left: 0, right: 0, height: 32,
               cursor: 'grab', display: 'flex', justifyContent: 'center', alignItems: 'center',
               opacity: 0.3
             }}
           >
             <GripHorizontal size={16} />
           </div>

           {/* Close Button */}
           <button
             onClick={() => setIsInspectorCollapsed(true)}
             style={{
               position: 'absolute',
               top: 8,
               right: 8,
               background: 'transparent',
               border: 'none',
               cursor: 'pointer',
               padding: 4,
               zIndex: 10
             }}
             title="关闭"
           >
             <X size={16} color="#94a3b8" />
           </button>

           {/* Section A: Today's Tasks */}
           <div style={{ marginBottom: 24, marginTop: 12 }}>
           <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#1e293b', display: 'flex', justifyContent: 'space-between' }}>
             <span>📅 今日任务</span>
             <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>{studyCoach.weekPlan.length > 0 ? 'Day 1' : '无计划'}</span>
           </div>
           
           <div className="task-list">
             {dayPlan.slice(0, 1).map((d) => (
               <div key={`insp-day-${d.day}`} className="task-item" style={{ background: '#f1f5f9', padding: 8 }}>
                 <div
                   className={`task-checkbox ${planDone[`day-${d.day}:base`] ? 'checked' : ''}`}
                   onClick={() => {
                     const id = `day-${d.day}:base`;
                     const next = { ...planDone, [id]: !planDone[id] };
                     setPlanDone(next);
                     persistPlanProgress({ done: next, reflections: planReflections, customTasks: customPlanTasks });
                   }}
                   role="button"
                   tabIndex={0}
                 ></div>
                 <div className="task-content">
                   <div className="task-text" style={{ fontSize: 12 }}>{d.text}</div>
                   <div
                     className="task-tag"
                     onClick={() => generatePracticeForWeakPoint(d.weakPoint, d.text)}
                     role="button"
                     tabIndex={0}
                     title="点击生成该错因专项 3 题"
                   >
                     {`${d.weakPoint}专项`}
                   </div>
                 </div>
               </div>
             ))}
             {(customByDay.get(1) || []).slice(0, 2).map((x) => (
               <div key={`insp-custom-${x.id}`} className="task-item" style={{ background: '#f1f5f9', padding: 8 }}>
                 <div
                   className={`task-checkbox ${planDone[x.id] ? 'checked' : ''}`}
                   onClick={() => {
                     const next = { ...planDone, [x.id]: !planDone[x.id] };
                     setPlanDone(next);
                     persistPlanProgress({ done: next, reflections: planReflections, customTasks: customPlanTasks });
                   }}
                   role="button"
                   tabIndex={0}
                 ></div>
                 <div className="task-content">
                   <div className="task-text" style={{ fontSize: 12 }}>{x.text}</div>
                   <div
                     className="task-tag"
                     onClick={() => generatePracticeForWeakPoint(x.weakPoint, x.text)}
                     role="button"
                     tabIndex={0}
                     title="点击生成该错因专项 3 题"
                   >
                     {`${x.weakPoint}专项`}
                   </div>
                 </div>
               </div>
             ))}
             {dayPlan.length === 0 && (
               <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                 暂无任务，请从左侧将错因“入计划”
               </div>
             )}
           </div>
         </div>

         {/* Section B: Risk Alerts */}
         {(review?.required || modules.problems.some((p:any) => p.desc?.includes('置信度：低') || p.desc?.includes('置信度:低'))) && (
           <div style={{ marginBottom: 24 }}>
             <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#b45309' }}>⚠️ 风险提示</div>
             <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: 10 }}>
               <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
                 部分题目置信度较低，建议核对原题或请老师人工复核。
               </div>
               <button 
                 className="op-btn-secondary" 
                 style={{ width: '100%', marginTop: 8, fontSize: 11, padding: '4px' }}
                 onClick={() => {
                   document.getElementById('problems-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                 }}
               >
                 查看详情
               </button>
             </div>
           </div>
         )}

         {/* Section C: Shortcuts */}
         <div>
           <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#1e293b' }}>⚡ 快捷指令</div>
           <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button 
              className="op-btn-secondary" 
              style={{ justifyContent: 'flex-start', fontSize: 12 }}
              onClick={handleToggle20MinPlan}
            >
              <span>⏱️</span> 压缩为 20 分钟计划
            </button>
            <button 
              className="op-btn-secondary" 
              style={{ justifyContent: 'flex-start', fontSize: 12 }}
              onClick={handleGenerateParentScript}
            >
              <span>💬</span> 生成家长沟通话术
            </button>
            <button 
              className="op-btn-secondary" 
              style={{ justifyContent: 'flex-start', fontSize: 12 }}
              onClick={handlePrintWeeklyNotebook}
            >
              <span>🖨️</span> 打印错题本 (本周)
            </button>
          </div>
        </div>
       </div>
      )}

      {/* Mobile Bottom Dock */}
      <div className="action-dock">
        <button
          className="dock-btn"
          onClick={() => generatePracticeForWeakPoint(defaultWeakPoint)}
          disabled={!!generatingWeakPoint}
          title="生成针对性练习"
        >
          <span style={{ fontSize: 20 }}>⚡</span>
          <span>练习</span>
        </button>
        <button
          className="dock-btn main"
          onClick={handleEnterAcceptance}
          disabled={generatingAcceptance}
          title={generatingAcceptance ? '正在生成验收小测' : '开始验收'}
        >
          <span style={{ fontSize: 20 }}>✅</span>
        </button>
        <button className="dock-btn" onClick={() => setIsPreviewOpen(true)} title="导出">
          <Download size={20} />
          <span>导出</span>
        </button>
      </div>

      {toastMsg && (
        <div className="toast-float">{toastMsg}</div>
      )}

      <AcceptanceModal
        isOpen={isAcceptanceOpen}
        onClose={() => setIsAcceptanceOpen(false)}
        quiz={effectiveAcceptanceQuiz || { title: '', passRule: '', questions: [] }}
        studentName={studentInfo.name}
        onPass={() => {
          const durationMinutes = data.startTime ? Math.round((Date.now() - data.startTime) / 60000) : 0;
          
          import('canvas-confetti').then((confetti) => {
            confetti.default({
              particleCount: 150,
              spread: 70,
              origin: { y: 0.6 }
            });
          }).catch(() => {
            console.log('Confetti passed');
          });

          if (onUpdateExam) {
            onUpdateExam({
              ...data,
              acceptanceResult: {
                passed: true,
                timestamp: new Date().toISOString(),
                durationMinutes
              }
            });
          }
        }}
        onFail={(result) => {
          const durationMinutes = data.startTime ? Math.round((Date.now() - data.startTime) / 60000) : 0;
          const nextAcceptance = {
            ...(data?.acceptanceResult || {}),
            ...result,
            durationMinutes,
          };

          const weakPoint = defaultWeakPoint;
          const ts = String(result.timestamp || new Date().toISOString());
          const id = `retrain-${ts}`;
          const already = customPlanTasks.some((t) => String((t as any)?.id || '') === id);
          const nextCustomTasks = already
            ? customPlanTasks
            : [{ id, day: 1, weakPoint, text: `二次训练：${weakPoint} 专项 3 题（验收未通过）` }, ...customPlanTasks];

          const nextPlanProgress = {
            done: planDone,
            reflections: planReflections,
            customTasks: nextCustomTasks,
          };

          setCustomPlanTasks(nextCustomTasks);

          if (onUpdateExam) {
            onUpdateExam({
              ...(data || {}),
              acceptanceResult: nextAcceptance,
              planProgress: nextPlanProgress,
            });
          }

          generatePracticeForWeakPoint(
            weakPoint,
            `验收未通过（正确 ${result.correctCount}/${result.total}）`,
            { acceptanceResult: nextAcceptance, planProgress: nextPlanProgress }
          );

          showToast('验收未通过：已自动触发二次训练并沉淀记录');
        }}
      />
      
      {/* 8. 预览模态框 (保持原有逻辑，仅作为隐藏功能或桌面端功能) */}
      {isPreviewOpen && (
        <div
          className="settings-overlay"
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            background: 'rgba(15, 23, 42, 0.55)',
          }}
        >
          <div
            className="hud-window"
            style={{
              width: 'min(96vw, 980px)',
              maxHeight: '90vh',
              transform: isDesktop ? `translate3d(${previewPosition.x}px, ${previewPosition.y}px, 0)` : undefined,
              transition: isPreviewDragging ? 'none' : undefined,
            }}
          >
            <div
              className="hud-header"
              onPointerDown={handlePreviewHeaderPointerDown}
              onPointerMove={handlePreviewHeaderPointerMove}
              onPointerUp={handlePreviewHeaderPointerUp}
              onPointerCancel={handlePreviewHeaderPointerUp}
            >
              <div className="hud-title">
                <span className="hud-title-text">打印预览</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  className="op-btn-secondary"
                  onClick={handleShare}
                  style={{ width: 'auto', padding: '0 14px', height: 32 }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <Share2 size={16} style={{ marginRight: 6 }} /> 分享/复制链接
                </button>
                <button
                  className="close-capsule-btn"
                  onClick={() => setIsPreviewOpen(false)}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label="关闭"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="hud-body" style={{ padding: 16, background: 'rgba(241, 245, 249, 0.65)' }}>
              <div
                style={{
                  background: 'white',
                  padding: 40,
                  maxWidth: 800,
                  margin: '0 auto',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                  borderRadius: 12,
                }}
              >
                <div className="force-print-display">
                  <PrintLayout data={data || { studentInfo, summary, modules }} />
                </div>
              </div>
            </div>

            <div className="hud-footer">
              <button className="op-btn-secondary" onClick={() => setIsPreviewOpen(false)} style={{ width: 'auto', padding: '0 18px', height: 36, borderRadius: 999 }}>
                取消
              </button>
              <button className="op-btn-primary" onClick={() => window.print()} style={{ width: 'auto', padding: '0 18px', height: 36, borderRadius: 999, marginLeft: 0 }}>
                <Download size={16} style={{ marginRight: 8 }} /> 打印 / 保存 PDF
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
