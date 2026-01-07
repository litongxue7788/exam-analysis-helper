import React, { useMemo } from 'react';
import { ArrowLeft, CalendarClock, CheckCircle2, Repeat2, Target } from 'lucide-react';

type ParentDashboardProps = {
  currentExam: any;
  examHistory: any[];
  onBack?: () => void;
  onUpdateExam?: (nextExam: any) => void;
};

const toTime = (v: any) => {
  const t = new Date(v || 0).getTime();
  return Number.isFinite(t) ? t : 0;
};

const normalizeText = (v: any) => String(v ?? '').trim();

const getWeakPoint = (exam: any) => {
  const a = normalizeText(exam?.summary?.weakestKnowledge);
  if (a) return a;
  const b = normalizeText(exam?.weakestKnowledge);
  if (b) return b;
  const c = normalizeText(exam?.modules?.problems?.[0]?.name);
  if (c) return c;
  return '薄弱点';
};

const buildDayBaseText = (exam: any, day: number) => {
  const weekPlan = Array.isArray(exam?.studyMethods?.weekPlan) ? exam.studyMethods.weekPlan : [];
  const raw = normalizeText(weekPlan[day - 1]);
  if (raw) return raw;
  const weakPoint = getWeakPoint(exam);
  if (day === 7) return `第 7 天：验收小测 + 结果归档到错题巩固本（复盘 1 句）`;
  return `第 ${day} 天：${weakPoint} 专项 3 题（20 分钟）+ 复盘一句话`;
};

const getDayTasks = (exam: any, day: number) => {
  const planProgress = exam?.planProgress || {};
  const customTasks = Array.isArray(planProgress.customTasks) ? planProgress.customTasks : [];
  const extras = customTasks
    .filter((x: any) => Number(x?.day) === day)
    .map((x: any) => ({
      id: String(x?.id || ''),
      text: normalizeText(x?.text),
    }))
    .filter((x: any) => x.id && x.text);

  const baseId = `day-${day}:base`;
  return [{ id: baseId, text: buildDayBaseText(exam, day) }, ...extras];
};

const calcDoneRate = (done: Record<string, boolean>, tasks: { id: string; text: string }[]) => {
  const total = tasks.length;
  if (!total) return { total: 0, doneCount: 0, rate: 0 };
  const doneCount = tasks.reduce((acc, t) => acc + (done[t.id] ? 1 : 0), 0);
  const rate = Math.round((doneCount / total) * 100);
  return { total, doneCount, rate };
};

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ currentExam, examHistory, onBack, onUpdateExam }) => {
  const subject = normalizeText(currentExam?.studentInfo?.subject);
  const name = normalizeText(currentExam?.studentInfo?.name);
  const examName = normalizeText(currentExam?.studentInfo?.examName);

  const persistPlanProgress = (next: {
    done?: Record<string, boolean>;
    reflections?: Record<string, string>;
    customTasks?: { id: string; day: number; text: string; weakPoint?: string }[];
  }) => {
    const prev = (currentExam as any)?.planProgress || {};
    const merged = {
      done: next.done ?? prev.done ?? {},
      reflections: next.reflections ?? prev.reflections ?? {},
      customTasks: next.customTasks ?? prev.customTasks ?? [],
    };
    if (onUpdateExam) {
      onUpdateExam({
        ...(currentExam || {}),
        planProgress: merged,
      });
    }
  };

  const recentExams = useMemo(() => {
    const sorted = [...(Array.isArray(examHistory) ? examHistory : [])].sort((a, b) => toTime(a?.timestamp) - toTime(b?.timestamp));
    return sorted.slice(-5);
  }, [examHistory]);

  const planDone = useMemo(() => {
    const planProgress = currentExam?.planProgress || {};
    return (planProgress && typeof planProgress === 'object' && planProgress.done && typeof planProgress.done === 'object') ? planProgress.done : {};
  }, [currentExam]);

  const todayTasks = useMemo(() => getDayTasks(currentExam, 1), [currentExam]);
  const todayInfo = useMemo(() => ({ done: planDone, tasks: todayTasks, ...calcDoneRate(planDone, todayTasks) }), [planDone, todayTasks]);

  const tomorrowTasks = useMemo(() => getDayTasks(currentExam, 2), [currentExam]);

  const toggleTaskDone = (taskId: string) => {
    const id = String(taskId || '').trim();
    if (!id) return;
    const prevDone = planDone || {};
    const nextDone = { ...prevDone, [id]: !prevDone[id] };
    persistPlanProgress({ done: nextDone });
  };

  const acceptanceInfo = useMemo(() => {
    const eligible = recentExams.filter((e: any) => e && typeof e === 'object' && 'acceptanceResult' in e);
    const total = eligible.length;
    const passed = eligible.filter((e: any) => !!e?.acceptanceResult?.passed).length;
    const rate = total ? Math.round((passed / total) * 100) : 0;
    return { total, passed, rate };
  }, [recentExams]);

  const recurrenceInfo = useMemo(() => {
    const seq = recentExams.map((e: any) => getWeakPoint(e)).filter(Boolean);
    const counts: Record<string, number> = {};
    for (const w of seq) counts[w] = (counts[w] || 0) + 1;
    const top = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([weakPoint, count]) => {
        const marks = seq.map((x) => (x === weakPoint ? '●' : '○')).join('');
        return { weakPoint, count, marks };
      });
    return { seqCount: seq.length, top };
  }, [recentExams]);

  return (
    <div className="report-layout">
      <div className="context-bar">
        <div className="context-left">
          <div className="context-back">
            <button className="settings-btn" onClick={onBack} title="返回">
              <ArrowLeft size={20} color="#64748b" />
            </button>
          </div>
          <div className="context-info">
            <div className="context-title">家长驾驶舱</div>
            <div className="context-meta">
              <span>{name || '—'}</span>
              <span>•</span>
              <span>{subject || '—'}</span>
              <span>•</span>
              <span>{examName || '—'}</span>
            </div>
          </div>
        </div>
        <div className="stage-progress" style={{ padding: 4 }}>
          <div className="stage-step active" style={{ cursor: 'default' }}>
            最近{recentExams.length || 0}次
          </div>
        </div>
      </div>

      <div className="report-content">
        <div className="cmd-card">
          <div className="cmd-card-header">
            <div className="cmd-card-title">
              <Target size={16} /> 今日任务完成率
            </div>
            <div className="cmd-card-badge">{todayInfo.rate}%</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {todayInfo.doneCount}/{todayInfo.total} 完成
            </div>
            <div style={{ flex: 1, height: 10, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${todayInfo.rate}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, rgba(var(--theme-rgb, 37 99 235), 0.95), rgba(var(--theme-rgb, 37 99 235), 0.65))',
                }}
              />
            </div>
          </div>

          <div className="task-list">
            {todayInfo.tasks.map((t) => (
              <div key={t.id} className="task-item" style={{ background: '#fff' }}>
                <div
                  className={`task-checkbox ${todayInfo.done[t.id] ? 'checked' : ''}`}
                  onClick={() => toggleTaskDone(t.id)}
                  role="button"
                  tabIndex={0}
                />
                <div className="task-content">
                  <div className="task-text">{t.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="cmd-card">
          <div className="cmd-card-header">
            <div className="cmd-card-title">
              <CheckCircle2 size={16} /> 最近验收通过率
            </div>
            <div className="cmd-card-badge">{acceptanceInfo.total ? `${acceptanceInfo.rate}%` : '—'}</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {acceptanceInfo.total ? `${acceptanceInfo.passed}/${acceptanceInfo.total} 通过` : '暂无验收记录'}
            </div>
            {acceptanceInfo.total ? (
              <div style={{ fontSize: 12, color: acceptanceInfo.rate >= 80 ? '#16a34a' : acceptanceInfo.rate >= 60 ? '#f59e0b' : '#dc2626', fontWeight: 700 }}>
                {acceptanceInfo.rate >= 80 ? '稳定' : acceptanceInfo.rate >= 60 ? '需关注' : '偏低'}
              </div>
            ) : null}
          </div>
        </div>

        <div className="cmd-card">
          <div className="cmd-card-header">
            <div className="cmd-card-title">
              <Repeat2 size={16} /> 高频错因复发趋势
            </div>
            <div className="cmd-card-badge">{recurrenceInfo.seqCount ? `样本 ${recurrenceInfo.seqCount}` : '—'}</div>
          </div>

          {recurrenceInfo.top.length === 0 ? (
            <div style={{ fontSize: 12, color: '#64748b' }}>暂无可统计的薄弱点</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recurrenceInfo.top.map((x) => (
                <div key={x.weakPoint} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: '#fff', border: '1px solid #f1f5f9', borderRadius: 12, padding: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {x.weakPoint}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', letterSpacing: 1 }}>
                      {x.marks}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, flexShrink: 0 }}>
                    {x.count} 次
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="cmd-card">
          <div className="cmd-card-header">
            <div className="cmd-card-title">
              <CalendarClock size={16} /> 明日核心任务预告
            </div>
            <div className="cmd-card-badge">Day 2</div>
          </div>

          <div className="task-list">
            {tomorrowTasks.map((t) => (
              <div key={t.id} className="task-item" style={{ background: '#fff' }}>
                <div
                  className={`task-checkbox ${planDone[t.id] ? 'checked' : ''}`}
                  onClick={() => toggleTaskDone(t.id)}
                  role="button"
                  tabIndex={0}
                />
                <div className="task-content">
                  <div className="task-text">{t.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
