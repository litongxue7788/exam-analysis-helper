
export interface KnowledgePointStats {
  name: string;
  appearances: number;
  asWeakness: number;
  asStrength: number;
  lastSeen: string; // ISO date
  trend: 'improving' | 'declining' | 'stable' | 'new';
}

export const aggregateKnowledgePoints = (history: any[]): KnowledgePointStats[] => {
  const stats: Record<string, KnowledgePointStats> = {};

  // Sort by date ascending
  const sortedExams = [...history].sort((a, b) => {
    return new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime();
  });

  sortedExams.forEach((exam, index) => {
    const date = exam.timestamp || new Date().toISOString();
    
    // Process Weaknesses (from summary and modules.problems)
    const weaknesses: string[] = [];
    if (exam.summary?.weakestKnowledge) weaknesses.push(exam.summary.weakestKnowledge);
    if (Array.isArray(exam.modules?.problems)) {
      exam.modules.problems.forEach((p: any) => {
        if (p.name) weaknesses.push(p.name);
      });
    }

    // Process Strengths
    const strengths: string[] = [];
    if (exam.summary?.strongestKnowledge) strengths.push(exam.summary.strongestKnowledge);

    // Update stats
    [...new Set(weaknesses)].forEach(name => {
      if (!stats[name]) {
        stats[name] = { name, appearances: 0, asWeakness: 0, asStrength: 0, lastSeen: date, trend: 'new' };
      }
      stats[name].appearances++;
      stats[name].asWeakness++;
      stats[name].lastSeen = date;
      
      // Simple trend logic: if appeared as weakness recently and was weakness before
      if (index === sortedExams.length - 1) {
         // It's a current weakness
         stats[name].trend = stats[name].asWeakness > 1 ? 'declining' : 'new';
      }
    });

    [...new Set(strengths)].forEach(name => {
      if (!stats[name]) {
        stats[name] = { name, appearances: 0, asWeakness: 0, asStrength: 0, lastSeen: date, trend: 'new' };
      }
      stats[name].appearances++;
      stats[name].asStrength++;
      stats[name].lastSeen = date;

      if (index === sortedExams.length - 1) {
        stats[name].trend = 'improving';
      }
    });
  });

  return Object.values(stats).sort((a, b) => b.appearances - a.appearances);
};
