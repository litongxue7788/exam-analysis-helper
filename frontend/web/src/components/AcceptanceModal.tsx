import React, { useEffect, useRef, useState } from 'react';
import { X, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';
import { LatexRenderer } from './LatexRenderer';

interface Question {
  no: number;
  content: string;
  hints?: string[];
}

interface AcceptanceQuiz {
  title: string;
  passRule: string;
  questions: Question[];
}

interface AcceptanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: any;
  studentName: string;
  onPass?: () => void; // New callback
  onFail?: (result: {
    passed: false;
    total: number;
    correctCount: number;
    wrongCount: number;
    results: boolean[];
    revealedHints: Record<number, number>;
    timestamp: string;
  }) => void;
}

export const AcceptanceModal: React.FC<AcceptanceModalProps> = ({ isOpen, onClose, quiz, studentName, onPass, onFail }) => {
  const [step, setStep] = useState<'intro' | 'answering' | 'result'>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealedHints, setRevealedHints] = useState<Record<number, number>>({}); // questionIndex -> hints count
  const [showAnswer, setShowAnswer] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setStep('intro');
      setCurrentIndex(0);
      setRevealedHints({});
      setShowAnswer(false);
      setResults(new Array(quiz.questions.length).fill(false));
    }
  }, [isOpen, quiz]);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!isOpen) return null;

  const currentQ = quiz.questions[currentIndex];
  const totalQ = quiz.questions.length;

  const handleStart = () => {
    setStep('answering');
  };

  const handleRevealHint = () => {
    setRevealedHints(prev => ({
      ...prev,
      [currentIndex]: (prev[currentIndex] || 0) + 1
    }));
  };

  const handleCheckAnswer = () => {
    setShowAnswer(true);
  };

  const handleResult = (success: boolean) => {
    const newResults = [...results];
    newResults[currentIndex] = success;
    setResults(newResults);

    if (currentIndex < totalQ - 1) {
      // Next question
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
    } else {
      // Finish
      setStep('result');
    }
  };

  // Simple pass logic: if passRule contains "全对", then all must be true.
  // Otherwise, if > 60% correct.
  const passed = (() => {
    const correctCount = results.filter(Boolean).length;
    if (quiz.passRule.includes('全对')) {
      return correctCount === totalQ;
    }
    return correctCount / totalQ >= 0.6;
  })();

  const resultPayload = () => {
    const correctCount = results.filter(Boolean).length;
    const wrongCount = totalQ - correctCount;
    return {
      passed: false as const,
      total: totalQ,
      correctCount,
      wrongCount,
      results,
      revealedHints,
      timestamp: new Date().toISOString(),
    };
  };

  const handleHeaderPointerDown = (e: React.PointerEvent) => {
    if (!isDesktop) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: position.x,
      originY: position.y,
    };
  };

  const handleHeaderPointerMove = (e: React.PointerEvent) => {
    if (!isDesktop) return;
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    setPosition({ x: d.originX + (e.clientX - d.startX), y: d.originY + (e.clientY - d.startY) });
  };

  const handleHeaderPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
  };

  return (
    <div className="settings-overlay" style={{ justifyContent: 'center', alignItems: 'center', background: 'rgba(15, 23, 42, 0.55)' }}>
      <div
        className="hud-window"
        style={{
          width: 'min(92vw, 720px)',
          maxHeight: '90vh',
          transform: isDesktop ? `translate3d(${position.x}px, ${position.y}px, 0)` : undefined,
          transition: isDragging ? 'none' : undefined,
        }}
      >
        <div
          className="hud-header"
          onPointerDown={handleHeaderPointerDown}
          onPointerMove={handleHeaderPointerMove}
          onPointerUp={handleHeaderPointerUp}
          onPointerCancel={handleHeaderPointerUp}
        >
          <div className="hud-title">
            <span className="hud-title-text">
              {step === 'intro' ? '验收任务' : step === 'result' ? '验收结果' : `正在验收 (${currentIndex + 1}/${totalQ})`}
            </span>
          </div>
          <button className="close-capsule-btn" onClick={onClose} onPointerDown={(e) => e.stopPropagation()} aria-label="关闭">
            <X size={18} />
          </button>
        </div>

        <div className="hud-body">
          
          {step === 'intro' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ marginBottom: 20 }}>
                <CheckCircle size={64} color="#66BB6A" style={{ opacity: 0.8 }} />
              </div>
              <h2 style={{ fontSize: 20, marginBottom: 10 }}>准备好开始验收了吗？</h2>
              <p style={{ color: '#666', lineHeight: 1.6, marginBottom: 30 }}>
                Hi {studentName}，为了确保你已经掌握了刚才复盘的薄弱点，
                <br/>我们需要通过 <strong>{totalQ}</strong> 道小题来验证一下。
              </p>
              <div style={{ background: '#F5F5F5', padding: '16px', borderRadius: 12, display: 'inline-block', textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 6, color: '#333' }}>通关规则：</div>
                <div style={{ fontSize: 14, color: '#555' }}>{quiz.passRule}</div>
              </div>
            </div>
          )}

          {step === 'answering' && (
            <div>
              <div style={{ fontSize: 13, color: '#999', marginBottom: 8 }}>题目 {currentIndex + 1}</div>
              <div style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.6, color: '#333', marginBottom: 24 }}>
                <LatexRenderer text={currentQ.content} />
              </div>

              {/* Hints Area */}
              {currentQ.hints && currentQ.hints.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: '#666' }}>遇到困难？可以查看提示（不影响通关）</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {currentQ.hints.map((h: string, idx: number) => {
                      const isRevealed = (revealedHints[currentIndex] || 0) > idx;
                      return (
                        <div key={idx} style={{ 
                          flex: 1, minWidth: '100px',
                          background: isRevealed ? '#FFF8E1' : '#F5F5F5',
                          border: isRevealed ? '1px solid #FFE0B2' : '1px solid #EEE',
                          borderRadius: 8, padding: 12,
                          cursor: isRevealed ? 'default' : 'pointer',
                          transition: 'all 0.2s'
                        }} onClick={() => !isRevealed && handleRevealHint()}>
                          <div style={{ fontSize: 12, fontWeight: 'bold', color: isRevealed ? '#F57C00' : '#999', marginBottom: 4 }}>
                            提示 {idx + 1} {isRevealed ? '' : '(点击解锁)'}
                          </div>
                          {isRevealed && (
                            <div style={{ fontSize: 13, color: '#333' }}>
                              <LatexRenderer text={h} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Area */}
              {!showAnswer ? (
                <div style={{ textAlign: 'center', marginTop: 40 }}>
                  <button className="op-btn-primary" onClick={handleCheckAnswer} style={{ width: '100%', padding: '14px' }}>
                    我做完了，核对答案
                  </button>
                </div>
              ) : (
                <div style={{ marginTop: 30, padding: 20, background: '#FAFAFA', borderRadius: 12, border: '1px solid #EEE' }}>
                  <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <h3 style={{ fontSize: 16, marginBottom: 12 }}>请诚实自评</h3>
                    <p style={{ fontSize: 14, color: '#666' }}>参考答案：(此处为模拟，实际应由后端返回)</p>
                    <div style={{ fontSize: 14, color: '#333', fontStyle: 'italic', margin: '10px 0' }}>
                      "略（模拟答案）"
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button 
                      onClick={() => handleResult(false)}
                      style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid #FFCDD2', background: '#FFEBEE', color: '#C62828', cursor: 'pointer', fontWeight: 600 }}
                    >
                      <X size={16} style={{ verticalAlign: 'middle', marginRight: 4 }}/> 
                      做错了 / 没做出来
                    </button>
                    <button 
                      onClick={() => handleResult(true)}
                      style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid #C8E6C9', background: '#E8F5E9', color: '#2E7D32', cursor: 'pointer', fontWeight: 600 }}
                    >
                      <CheckCircle size={16} style={{ verticalAlign: 'middle', marginRight: 4 }}/>
                      做对了
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'result' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ marginBottom: 20 }}>
                {passed ? (
                  <CheckCircle size={80} color="#66BB6A" />
                ) : (
                  <AlertCircle size={80} color="#FF7043" />
                )}
              </div>
              <h2 style={{ fontSize: 24, marginBottom: 10, color: passed ? '#2E7D32' : '#D84315' }}>
                {passed ? '验收通过！' : '还需努力'}
              </h2>
              <p style={{ color: '#666', lineHeight: 1.6, marginBottom: 30 }}>
                {passed 
                  ? `太棒了！你已经击败了 ${85 + Math.floor(Math.random() * 10)}% 的同龄人。` 
                  : '没关系，发现问题就是进步的开始。建议点击下方按钮生成针对性练习。'}
              </p>
            </div>
          )}

        </div>

        {step === 'intro' && (
          <div className="hud-footer">
            <button className="op-btn-secondary" onClick={onClose} style={{ width: 'auto', padding: '0 20px' }}>
              取消
            </button>
            <button className="op-btn-primary" onClick={handleStart} style={{ width: 'auto', padding: '0 20px' }}>
              开始验收
            </button>
          </div>
        )}

        {step === 'answering' && (
          <div className="hud-footer" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {results.map((r, i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: 4, background: i >= currentIndex ? '#eee' : (r ? '#66BB6A' : '#FF7043') }} />
              ))}
              <div style={{ width: 8, height: 8, borderRadius: 4, background: '#2196F3' }} />
              {Array.from({ length: totalQ - 1 - currentIndex }).map((_, i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: 4, background: '#eee' }} />
              ))}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
              无需草稿纸，心算或口述关键步骤
            </div>
          </div>
        )}

        {step === 'result' && (
          <div className="hud-footer">
            <button className="op-btn-secondary" onClick={() => setStep('intro')} style={{ width: 'auto', padding: '0 20px' }}>
              <RotateCcw size={16} style={{ marginRight: 6, verticalAlign: 'middle' }}/>
              再测一次
            </button>
            {passed ? (
              <button className="op-btn-primary" onClick={() => {
                if (onPass) onPass();
                onClose();
              }} style={{ width: 'auto', padding: '0 20px' }}>
                完成
              </button>
            ) : (
              <button className="op-btn-primary" onClick={() => {
                if (onFail) onFail(resultPayload());
                onClose();
              }} style={{ width: 'auto', padding: '0 20px', background: '#FF7043' }}>
                去巩固练习
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
