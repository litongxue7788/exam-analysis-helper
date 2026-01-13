// =================================================================================
// 知识点库管理模块 (Knowledge Point Database)
// 维护标准知识点库，支持快速查询和匹配
// =================================================================================

import fs from 'fs';
import path from 'path';

export interface KnowledgePointEntry {
  id: string;
  name: string;              // 标准名称
  aliases: string[];         // 别名（用于模糊匹配）
  subject: string;           // 学科
  grades: string[];          // 适用年级
  difficulty: 'basic' | 'medium' | 'hard';
  keywords: string[];        // 关键词
  examples: string[];        // 示例题目描述
}

export class KnowledgePointDatabase {
  private knowledgePoints: KnowledgePointEntry[] = [];
  private nameIndex: Map<string, KnowledgePointEntry> = new Map();
  private keywordIndex: Map<string, KnowledgePointEntry[]> = new Map();
  private subjectIndex: Map<string, KnowledgePointEntry[]> = new Map();
  private gradeIndex: Map<string, KnowledgePointEntry[]> = new Map();

  constructor() {
    this.loadKnowledgePoints();
    this.buildIndexes();
  }

  /**
   * 加载知识点库
   */
  private loadKnowledgePoints(): void {
    try {
      const dataPath = path.resolve(__dirname, '../data/knowledge-points.json');
      const data = fs.readFileSync(dataPath, 'utf-8');
      const parsed = JSON.parse(data);
      this.knowledgePoints = parsed.knowledgePoints || [];
      console.log(`✅ [Knowledge Point Database] 已加载 ${this.knowledgePoints.length} 个知识点`);
    } catch (error) {
      console.error('❌ [Knowledge Point Database] 加载失败:', error);
      this.knowledgePoints = [];
    }
  }

  /**
   * 构建索引
   */
  private buildIndexes(): void {
    // 清空索引
    this.nameIndex.clear();
    this.keywordIndex.clear();
    this.subjectIndex.clear();
    this.gradeIndex.clear();

    for (const kp of this.knowledgePoints) {
      // 名称索引
      this.nameIndex.set(kp.name.toLowerCase(), kp);
      for (const alias of kp.aliases) {
        this.nameIndex.set(alias.toLowerCase(), kp);
      }

      // 关键词索引
      for (const keyword of kp.keywords) {
        const key = keyword.toLowerCase();
        if (!this.keywordIndex.has(key)) {
          this.keywordIndex.set(key, []);
        }
        this.keywordIndex.get(key)!.push(kp);
      }

      // 学科索引
      const subject = kp.subject.toLowerCase();
      if (!this.subjectIndex.has(subject)) {
        this.subjectIndex.set(subject, []);
      }
      this.subjectIndex.get(subject)!.push(kp);

      // 年级索引
      for (const grade of kp.grades) {
        const gradeKey = grade.toLowerCase();
        if (!this.gradeIndex.has(gradeKey)) {
          this.gradeIndex.set(gradeKey, []);
        }
        this.gradeIndex.get(gradeKey)!.push(kp);
      }
    }

    console.log(`✅ [Knowledge Point Database] 索引构建完成`);
  }

  /**
   * 精确匹配：根据名称查找知识点
   */
  findByName(name: string): KnowledgePointEntry | null {
    const key = name.toLowerCase().trim();
    return this.nameIndex.get(key) || null;
  }

  /**
   * 关键词匹配：根据关键词查找知识点
   */
  findByKeywords(keywords: string[]): KnowledgePointEntry[] {
    const results = new Set<KnowledgePointEntry>();
    
    for (const keyword of keywords) {
      const key = keyword.toLowerCase().trim();
      const matches = this.keywordIndex.get(key) || [];
      for (const match of matches) {
        results.add(match);
      }
    }

    return Array.from(results);
  }

  /**
   * 模糊匹配：根据文本模糊查找知识点
   */
  fuzzyMatch(text: string): KnowledgePointEntry[] {
    const normalizedText = text.toLowerCase().trim();
    const results: Array<{ entry: KnowledgePointEntry; score: number }> = [];

    for (const kp of this.knowledgePoints) {
      let score = 0;

      // 检查名称匹配
      if (normalizedText.includes(kp.name.toLowerCase())) {
        score += 10;
      }

      // 检查别名匹配
      for (const alias of kp.aliases) {
        if (normalizedText.includes(alias.toLowerCase())) {
          score += 8;
        }
      }

      // 检查关键词匹配
      for (const keyword of kp.keywords) {
        if (normalizedText.includes(keyword.toLowerCase())) {
          score += 5;
        }
      }

      if (score > 0) {
        results.push({ entry: kp, score });
      }
    }

    // 按分数排序
    results.sort((a, b) => b.score - a.score);

    return results.map(r => r.entry);
  }

  /**
   * 根据学科筛选知识点
   */
  getBySubject(subject: string): KnowledgePointEntry[] {
    const key = subject.toLowerCase().trim();
    return this.subjectIndex.get(key) || [];
  }

  /**
   * 根据年级筛选知识点
   */
  getByGrade(grade: string): KnowledgePointEntry[] {
    const key = grade.toLowerCase().trim();
    return this.gradeIndex.get(key) || [];
  }

  /**
   * 获取所有知识点
   */
  getAll(): KnowledgePointEntry[] {
    return [...this.knowledgePoints];
  }

  /**
   * 重新加载知识点库（支持热更新）
   */
  reload(): void {
    this.loadKnowledgePoints();
    this.buildIndexes();
  }
}

// 单例模式
let databaseInstance: KnowledgePointDatabase | null = null;

export function getKnowledgePointDatabase(): KnowledgePointDatabase {
  if (!databaseInstance) {
    databaseInstance = new KnowledgePointDatabase();
  }
  return databaseInstance;
}
