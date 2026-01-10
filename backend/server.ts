import express from 'express';
import type { Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AnalyzeExamRequest, AnalyzeExamResponse } from './api/interface';
import { USER_PROMPT_TEMPLATE, getGradeLevelInstruction, getSubjectPracticeInstruction, getSubjectAnalysisInstruction } from './llm/prompts';
import { llmService } from './llm/service';



// =================================================================================
// 真正的 Web 后端服务
// =================================================================================

const app = express();
const PORT = (() => {
  const v = Number(process.env.PORT || 3002);
  if (!Number.isFinite(v) || v <= 0) return 3002;
  return Math.floor(v);
})();
const repoRoot = (() => {
  let dir = __dirname;
  for (let i = 0; i < 8; i += 1) {
    const marker = path.resolve(dir, 'config', 'default.json');
    if (fs.existsSync(marker)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(__dirname, '..');
})();
const LLM_CONFIG_PATH = path.resolve(repoRoot, 'config', 'llm.json');
const WEB_DIST_DIR = path.resolve(repoRoot, 'frontend', 'web', 'dist');
const WEB_INDEX_HTML = path.resolve(WEB_DIST_DIR, 'index.html');
const HAS_WEB_DIST = fs.existsSync(WEB_INDEX_HTML);

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function extractJsonCandidate(rawContent: string): string {
  const cleaned = String(rawContent || '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  const firstObj = cleaned.indexOf('{');
  const firstArr = cleaned.indexOf('[');
  const starts: number[] = [];
  if (firstObj >= 0) starts.push(firstObj);
  if (firstArr >= 0) starts.push(firstArr);
  const start = starts.length ? Math.min(...starts) : -1;
  if (start < 0) return cleaned;

  const endObj = cleaned.lastIndexOf('}');
  const endArr = cleaned.lastIndexOf(']');
  const ends: number[] = [];
  if (endObj >= 0) ends.push(endObj);
  if (endArr >= 0) ends.push(endArr);
  const end = ends.length ? Math.max(...ends) : -1;
  if (end < start) return cleaned;

  return cleaned.slice(start, end + 1).trim();
}

function coerceJsonCandidate(raw: string): string {
  let s = String(raw || '').trim();
  s = s.replace(/\uFEFF/g, '');
  s = s.replace(/,\s*([}\]])/g, '$1');
  s = s.replace(/\\u(?![0-9a-fA-F]{4})/g, '\\\\u');
  s = s.replace(/\\(?![\\/"bfnrtu])/g, '\\\\');
  s = s.replace(/([{,]\s*)([A-Za-z0-9_\u00A0-\uFFFF-]+)\s*:/gu, (match, prefix, key) => {
    const k = String(key || '').trim();
    if (!k) return match;
    return `${prefix}"${k.replace(/"/g, '\\"')}":`;
  });
  s = s.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_match, inner) => {
    const v = String(inner || '').replace(/"/g, '\\"');
    return `"${v}"`;
  });
  return s;
}

function parseLlmJson(rawContent: string): { ok: true; value: any; usedText: string } | { ok: false; error: Error; usedText: string } {
  const candidate = extractJsonCandidate(rawContent);
  try {
    return { ok: true, value: JSON.parse(candidate), usedText: candidate };
  } catch (e: any) {
    try {
      const coerced = coerceJsonCandidate(candidate);
      return { ok: true, value: JSON.parse(coerced), usedText: coerced };
    } catch (e2: any) {
      const err = e2 instanceof Error ? e2 : new Error(String(e2));
      return { ok: false, error: err, usedText: candidate };
    }
  }
}

type ImageAnalyzeJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'canceled';
type ImageAnalyzeJobStage =
  | 'queued'
  | 'extracting'
  | 'diagnosing'
  | 'practicing'
  | 'merging'
  | 'completed'
  | 'failed'
  | 'canceled';

type ImageAnalyzeJobEvent =
  | {
      type: 'snapshot';
      job: {
        id: string;
        status: ImageAnalyzeJobStatus;
        stage: ImageAnalyzeJobStage;
        createdAt: number;
        updatedAt: number;
        errorMessage?: string;
        imageCount?: number;
        estimateSeconds?: number;
      };
    }
  | { type: 'progress'; stage: ImageAnalyzeJobStage; message?: string; provider?: string; at: number }
  | { type: 'partial_result'; result: AnalyzeExamResponse; at: number }
  | { type: 'result'; result: AnalyzeExamResponse; at: number }
  | { type: 'error'; stage: 'failed'; errorMessage: string; at: number };

type ImageAnalyzeJobBufferedEvent = {
  id: number;
  data: ImageAnalyzeJobEvent;
};

type ImageAnalyzeJobRequest = {
  images: string[];
  ocrTexts?: string[];
  provider?: 'doubao' | 'aliyun' | 'zhipu';
  subject?: string;
  grade?: string;
};

type ImageAnalyzeJobRecord = {
  id: string;
  status: ImageAnalyzeJobStatus;
  stage: ImageAnalyzeJobStage;
  createdAt: number;
  updatedAt: number;
  request: ImageAnalyzeJobRequest;
  imageCount: number;
  estimateSeconds: number;
  cacheKey?: string;
  bypassCache?: boolean;
  partialResult?: AnalyzeExamResponse;
  result?: AnalyzeExamResponse;
  errorMessage?: string;
  events?: ImageAnalyzeJobBufferedEvent[];
  nextEventId?: number;
};

const imageAnalyzeJobs = new Map<string, ImageAnalyzeJobRecord>();
const imageAnalyzeJobStreams = new Map<string, Set<Response>>();
const imageAnalyzeJobQueue: string[] = [];
let imageAnalyzeJobRunningCount = 0;

function getMaxConcurrentJobs(): number {
  const v = Number(process.env.MAX_CONCURRENT_IMAGE_JOBS || process.env.MAX_CONCURRENT_JOBS || 2);
  if (!Number.isFinite(v) || v <= 0) return 1;
  return Math.min(8, Math.max(1, Math.floor(v)));
}

function getJobTtlMs(): number {
  const v = Number(process.env.JOB_TTL_MS || process.env.IMAGE_JOB_TTL_MS || 2 * 60 * 60 * 1000);
  if (!Number.isFinite(v) || v <= 0) return 2 * 60 * 60 * 1000;
  return Math.min(24 * 60 * 60 * 1000, Math.max(5 * 60 * 1000, Math.floor(v)));
}

function getMaxJobsInMemory(): number {
  const v = Number(process.env.MAX_JOBS_IN_MEMORY || 200);
  if (!Number.isFinite(v) || v <= 0) return 200;
  return Math.min(2000, Math.max(50, Math.floor(v)));
}

function getEventBufferSize(): number {
  const v = Number(process.env.JOB_EVENT_BUFFER_SIZE || 40);
  if (!Number.isFinite(v) || v <= 0) return 40;
  return Math.min(200, Math.max(10, Math.floor(v)));
}

function estimateAnalyzeSeconds(imageCount: number): number {
  const n = Math.max(0, Math.floor(Number(imageCount) || 0));
  const base = 55;
  const per = 45;
  const secs = base + n * per;
  return Math.max(45, Math.min(360, secs));
}

type ImageAnalyzeResultCacheRecord = {
  key: string;
  createdAt: number;
  updatedAt: number;
  result: AnalyzeExamResponse;
};

const imageAnalyzeResultCache = new Map<string, ImageAnalyzeResultCacheRecord>();

function getImageAnalyzeCacheTtlMs(): number {
  const v = Number(process.env.IMAGE_ANALYZE_CACHE_TTL_MS || 7 * 24 * 60 * 60 * 1000);
  if (!Number.isFinite(v) || v <= 0) return 7 * 24 * 60 * 60 * 1000;
  return Math.min(30 * 24 * 60 * 60 * 1000, Math.max(10 * 60 * 1000, Math.floor(v)));
}

function computeImagesDigest(images: string[]): string {
  const h = crypto.createHash('sha256');
  for (const img of images || []) {
    const one = crypto.createHash('sha256').update(String(img || '')).digest('hex');
    h.update(one);
    h.update('|');
  }
  return h.digest('hex');
}

function computeTextListDigest(texts: string[]): string {
  const h = crypto.createHash('sha256');
  for (const t of texts || []) {
    const one = crypto.createHash('sha256').update(String(t || '')).digest('hex');
    h.update(one);
    h.update('|');
  }
  return h.digest('hex');
}

function pickOcrText(req: ImageAnalyzeJobRequest): string | null {
  const list = Array.isArray(req.ocrTexts) ? req.ocrTexts : [];
  const normalized = list
    .map((v) => String(v || '').trim())
    .filter((v) => v.length > 0);
  if (normalized.length === 0) return null;
  const joined = normalized.join('\n\n---\n\n').trim();
  if (!joined) return null;
  return joined;
}

function resolveStageProviders(req: ImageAnalyzeJobRequest): {
  extract: 'doubao' | 'aliyun' | 'zhipu';
  diagnose: 'doubao' | 'aliyun' | 'zhipu';
  practice: 'doubao' | 'aliyun' | 'zhipu';
} {
  const fallback = (process.env.DEFAULT_PROVIDER as any) || 'doubao';
  const base = (req.provider as any) || fallback;
  const extract = (process.env.EXTRACT_PROVIDER as any) || base;
  const diagnose = (process.env.DIAGNOSE_PROVIDER as any) || base;
  const practice = (process.env.PRACTICE_PROVIDER as any) || base;
  return { extract, diagnose, practice };
}

function computeImageAnalyzeCacheKey(req: ImageAnalyzeJobRequest): string {
  const providers = resolveStageProviders(req);
  const payload = {
    imagesDigest: computeImagesDigest(req.images || []),
    ocrDigest: computeTextListDigest(Array.isArray(req.ocrTexts) ? req.ocrTexts : []),
    subject: String(req.subject || ''),
    grade: String(req.grade || ''),
    providers,
  };
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function getCachedImageAnalyzeResult(cacheKey: string): AnalyzeExamResponse | null {
  const rec = imageAnalyzeResultCache.get(cacheKey);
  if (!rec) return null;
  const ttl = getImageAnalyzeCacheTtlMs();
  if (Date.now() - rec.updatedAt > ttl) {
    imageAnalyzeResultCache.delete(cacheKey);
    return null;
  }
  return rec.result;
}

function setCachedImageAnalyzeResult(cacheKey: string, result: AnalyzeExamResponse) {
  const now = Date.now();
  imageAnalyzeResultCache.set(cacheKey, { key: cacheKey, createdAt: now, updatedAt: now, result });
}

function cleanupExpiredImageAnalyzeCache() {
  const ttl = getImageAnalyzeCacheTtlMs();
  const now = Date.now();
  for (const [k, v] of imageAnalyzeResultCache.entries()) {
    if (now - v.updatedAt > ttl) imageAnalyzeResultCache.delete(k);
  }
}

function writeSse(res: Response, payload: ImageAnalyzeJobEvent, id?: number) {
  if (typeof id === 'number' && Number.isFinite(id) && id > 0) {
    res.write(`id: ${Math.floor(id)}\n`);
  }
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function broadcastSse(jobId: string, payload: ImageAnalyzeJobEvent) {
  const job = imageAnalyzeJobs.get(jobId);
  let bufferedId: number | undefined = undefined;
  if (job) {
    const nextId = Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, Math.floor(job.nextEventId || 1)));
    job.nextEventId = nextId + 1;
    bufferedId = nextId;
    const bufSize = getEventBufferSize();
    const prev = Array.isArray(job.events) ? job.events : [];
    const next = [...prev, { id: bufferedId, data: payload }];
    job.events = next.length > bufSize ? next.slice(next.length - bufSize) : next;
  }
  const set = imageAnalyzeJobStreams.get(jobId);
  if (!set || set.size === 0) return;
  for (const res of set) {
    try {
      writeSse(res, payload, bufferedId);
    } catch {}
  }
}

function trimJobsInMemory() {
  const max = getMaxJobsInMemory();
  if (imageAnalyzeJobs.size <= max) return;
  const jobs = Array.from(imageAnalyzeJobs.values());
  jobs.sort((a, b) => a.updatedAt - b.updatedAt);
  const over = imageAnalyzeJobs.size - max;
  let removed = 0;
  for (const j of jobs) {
    if (removed >= over) break;
    if (j.status === 'running' || j.status === 'pending') continue;
    imageAnalyzeJobs.delete(j.id);
    imageAnalyzeJobStreams.delete(j.id);
    removed += 1;
  }
}

function cleanupExpiredJobs() {
  const ttl = getJobTtlMs();
  const now = Date.now();
  for (const [id, job] of imageAnalyzeJobs.entries()) {
    if (job.status === 'running' || job.status === 'pending') continue;
    if (now - job.updatedAt > ttl) {
      imageAnalyzeJobs.delete(id);
      imageAnalyzeJobStreams.delete(id);
    }
  }
  trimJobsInMemory();
}

setInterval(() => cleanupExpiredJobs(), 60_000);
setInterval(() => cleanupExpiredImageAnalyzeCache(), 60_000);

function pumpImageAnalyzeQueue() {
  const limit = getMaxConcurrentJobs();
  while (imageAnalyzeJobRunningCount < limit) {
    const nextId = imageAnalyzeJobQueue.shift();
    if (!nextId) break;
    const job = imageAnalyzeJobs.get(nextId);
    if (!job) continue;
    if (job.status !== 'pending') continue;
    imageAnalyzeJobRunningCount += 1;
    runImageAnalyzeJob(nextId).finally(() => {
      imageAnalyzeJobRunningCount = Math.max(0, imageAnalyzeJobRunningCount - 1);
      pumpImageAnalyzeQueue();
    });
  }
}

function pickSecondaryProvider(primary: 'doubao' | 'aliyun' | 'zhipu'): 'doubao' | 'aliyun' | 'zhipu' {
  const order: ('doubao' | 'aliyun' | 'zhipu')[] = ['doubao', 'aliyun', 'zhipu'];
  const idx = order.indexOf(primary);
  return order[(idx + 1) % order.length] || 'aliyun';
}

async function delay(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return;
  await new Promise<void>((r) => setTimeout(r, ms));
}

async function callWithRetry<T>(fn: () => Promise<T>, retryCount: number, baseDelayMs: number): Promise<T> {
  let lastErr: any = null;
  for (let i = 0; i <= retryCount; i += 1) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      if (i >= retryCount) break;
      const wait = Math.max(0, baseDelayMs) * Math.pow(2, i);
      await delay(wait);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

function validateVisionJson(value: any): { ok: true } | { ok: false; reason: string } {
  if (!value || typeof value !== 'object') return { ok: false, reason: '输出不是对象' };
  const meta = (value as any).meta;
  const forStudent = (value as any).forStudent;
  const studyMethods = (value as any).studyMethods;
  if (!meta || typeof meta !== 'object') return { ok: false, reason: '缺少 meta' };
  if (typeof meta.examName !== 'string') return { ok: false, reason: 'meta.examName 缺失' };
  if (typeof meta.subject !== 'string') return { ok: false, reason: 'meta.subject 缺失' };
  // if (typeof meta.score !== 'number') return { ok: false, reason: 'meta.score 缺失' };
  // if (typeof meta.fullScore !== 'number') return { ok: false, reason: 'meta.fullScore 缺失' };
  if (!forStudent || typeof forStudent !== 'object') return { ok: false, reason: '缺少 forStudent' };
  if (typeof forStudent.overall !== 'string') return { ok: false, reason: 'forStudent.overall 缺失' };
  if (!studyMethods || typeof studyMethods !== 'object') return { ok: false, reason: '缺少 studyMethods' };
  return { ok: true };
}

function coerceToNumber(value: any): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;
  const raw = value.trim();
  if (!raw) return undefined;
  const match = raw.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  if (!match) return undefined;
  const n = Number(match[0]);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function normalizeMetaNumbers(meta: any) {
  if (!meta || typeof meta !== 'object') return;

  if (typeof meta.score !== 'number') {
    meta.score = coerceToNumber(meta.score) ?? 0;
  }
  if (typeof meta.fullScore !== 'number') {
    meta.fullScore = coerceToNumber(meta.fullScore) ?? 100;
  }

  if (Array.isArray(meta.typeAnalysis)) {
    for (const item of meta.typeAnalysis) {
      if (!item || typeof item !== 'object') continue;
      if (typeof (item as any).score !== 'number') {
        (item as any).score = coerceToNumber((item as any).score) ?? 0;
      }
      if (typeof (item as any).full !== 'number') {
        (item as any).full = coerceToNumber((item as any).full) ?? 0;
      }
    }
  }
}

function validateExtractJson(value: any): { ok: true } | { ok: false; reason: string } {
  if (!value || typeof value !== 'object') return { ok: false, reason: '输出不是对象' };
  const meta = (value as any).meta;
  const observations = (value as any).observations;
  if (!meta || typeof meta !== 'object') return { ok: false, reason: '缺少 meta' };
  if (typeof meta.examName !== 'string' || !meta.examName.trim()) return { ok: false, reason: 'meta.examName 缺失' };
  if (typeof meta.subject !== 'string' || !meta.subject.trim()) return { ok: false, reason: 'meta.subject 缺失' };
  if (typeof meta.score !== 'number') return { ok: false, reason: 'meta.score 缺失' };
  if (typeof meta.fullScore !== 'number') return { ok: false, reason: 'meta.fullScore 缺失' };
  if (!observations || typeof observations !== 'object') return { ok: false, reason: '缺少 observations' };
  const problems = (observations as any).problems;
  if (!Array.isArray(problems)) return { ok: false, reason: 'observations.problems 缺失' };
  return { ok: true };
}

function validateDiagnosisJson(value: any): { ok: true } | { ok: false; reason: string } {
  if (!value || typeof value !== 'object') return { ok: false, reason: '输出不是对象' };
  const forStudent = (value as any).forStudent;
  const studyMethods = (value as any).studyMethods;
  if (!forStudent || typeof forStudent !== 'object') return { ok: false, reason: '缺少 forStudent' };
  if (typeof forStudent.overall !== 'string' || !forStudent.overall.trim()) return { ok: false, reason: 'forStudent.overall 缺失' };
  if (!Array.isArray(forStudent.advice)) return { ok: false, reason: 'forStudent.advice 缺失' };
  if (!studyMethods || typeof studyMethods !== 'object') return { ok: false, reason: '缺少 studyMethods' };
  if (!Array.isArray(studyMethods.methods)) return { ok: false, reason: 'studyMethods.methods 缺失' };
  if (!Array.isArray(studyMethods.weekPlan)) return { ok: false, reason: 'studyMethods.weekPlan 缺失' };
  return { ok: true };
}

function validatePracticeJson(value: any): { ok: true } | { ok: false; reason: string } {
  if (!value || typeof value !== 'object') return { ok: false, reason: '输出不是对象' };
  const practicePaper = (value as any).practicePaper;
  const acceptanceQuiz = (value as any).acceptanceQuiz;
  if (!practicePaper || typeof practicePaper !== 'object') return { ok: false, reason: 'practicePaper 缺失' };
  if (!acceptanceQuiz || typeof acceptanceQuiz !== 'object') return { ok: false, reason: 'acceptanceQuiz 缺失' };
  return { ok: true };
}

async function generateTextJsonWithRepair(
  prompt: string,
  provider: 'doubao' | 'aliyun' | 'zhipu',
  stage: ImageAnalyzeJobStage,
  emit: (ev: ImageAnalyzeJobEvent) => void,
  validate: (value: any) => { ok: true } | { ok: false; reason: string },
  requiredStructure: string
): Promise<any> {
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS || 0);
  const retryCount = Math.max(0, Number(process.env.LLM_RETRY_COUNT || 1));
  const retryBaseDelayMs = Math.max(0, Number(process.env.LLM_RETRY_BASE_DELAY_MS || 800));

  emit({ type: 'progress', stage, provider, message: '开始生成', at: Date.now() });
  const rawContent = await callWithRetry(
    () => withTimeout(llmService.generateAnalysis(prompt, provider as any, { temperature: 0.4 }), timeoutMs, '调用超时'),
    retryCount,
    retryBaseDelayMs
  );

  let parsed = parseLlmJson(rawContent);
  const v1 = parsed.ok ? validate(parsed.value) : { ok: false as const, reason: 'JSON 解析失败' };
  if (!parsed.ok || v1.ok === false) {
    emit({ type: 'progress', stage, provider, message: '修复结构化结果', at: Date.now() });
    const repairPrompt = `
你刚才的输出不是合法 JSON 或结构不完整。请把下面内容转换为“严格合法 JSON”，只输出 JSON 本体，不要解释，不要 Markdown 代码块。

必须满足结构：
${requiredStructure}

原始输出如下：
${rawContent}
`.trim();
    const repaired = await callWithRetry(
      () => withTimeout(llmService.generateAnalysis(repairPrompt, provider as any, { temperature: 0.1 }), timeoutMs, '修复超时'),
      retryCount,
      retryBaseDelayMs
    );
    parsed = parseLlmJson(repaired);
  }

  if (!parsed.ok) throw parsed.error;
  const v2 = validate(parsed.value);
  if (!v2.ok) throw new Error(`结果结构不完整: ${v2.reason}`);
  return parsed.value;
}

async function analyzeExtractTextWithProvider(
  ocrText: string,
  prompt: string,
  provider: 'doubao' | 'aliyun' | 'zhipu',
  emit: (ev: ImageAnalyzeJobEvent) => void
): Promise<any> {
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS || 0);
  const retryCount = Math.max(0, Number(process.env.LLM_RETRY_COUNT || 1));
  const retryBaseDelayMs = Math.max(0, Number(process.env.LLM_RETRY_BASE_DELAY_MS || 800));

  const inputPrompt = `${prompt}\n\n【OCR文本】\n${String(ocrText || '').trim()}`.trim();

  emit({ type: 'progress', stage: 'extracting', provider, message: '开始解析 OCR 文本', at: Date.now() });
  const rawContent = await callWithRetry(
    () => withTimeout(llmService.generateAnalysis(inputPrompt, provider as any, { temperature: 0.2 }), timeoutMs, 'OCR 解析超时'),
    retryCount,
    retryBaseDelayMs
  );

  let parsed = parseLlmJson(rawContent);
  if (parsed.ok) {
    try {
      normalizeMetaNumbers((parsed.value as any)?.meta);
    } catch {}
  }
  if (!parsed.ok || validateExtractJson(parsed.value).ok === false) {
    emit({ type: 'progress', stage: 'extracting', provider, message: '修复结构化结果', at: Date.now() });
    const repairPrompt = `
你刚才的输出不是合法 JSON 或结构不完整。请把下面内容转换为“严格合法 JSON”，只输出 JSON 本体，不要解释，不要 Markdown 代码块。

必须满足结构：
- meta.examName (string)
- meta.subject (string)
- meta.score (number)
- meta.fullScore (number)
- meta.typeAnalysis (array of {type, score, full})
- meta.paperAppearance (object)
- observations.problems (string[])

原始输出如下：
${rawContent}
`.trim();
    const repaired = await callWithRetry(
      () => withTimeout(llmService.generateAnalysis(repairPrompt, provider as any, { temperature: 0.1 }), timeoutMs, '修复超时'),
      retryCount,
      retryBaseDelayMs
    );
    parsed = parseLlmJson(repaired);
    if (parsed.ok) {
      try {
        normalizeMetaNumbers((parsed.value as any)?.meta);
      } catch {}
    }
  }

  if (!parsed.ok) throw parsed.error;
  const v = validateExtractJson(parsed.value);
  if (!v.ok) throw new Error(`结果结构不完整: ${v.reason}`);
  return parsed.value;
}

async function analyzeExtractTextWithHedge(
  ocrText: string,
  prompt: string,
  primaryProvider: 'doubao' | 'aliyun' | 'zhipu',
  emit: (ev: ImageAnalyzeJobEvent) => void
): Promise<{ extracted: any; usedProvider: 'doubao' | 'aliyun' | 'zhipu' }> {
  const envSecondary = String(process.env.HEDGE_SECONDARY_PROVIDER || '').trim();
  const secondaryProvider = (envSecondary as any) || pickSecondaryProvider(primaryProvider);

  const hedgeEnabled = String(process.env.HEDGE_ENABLED || '1').trim() !== '0';
  const baseHedgeAfterMs = Math.max(0, Number(process.env.HEDGE_AFTER_MS || 3800));
  const hedgeAfterMs = Math.min(15000, Math.max(1500, baseHedgeAfterMs));

  const primaryCfg = llmService.getProviderConfig(primaryProvider);
  const secondaryCfg = llmService.getProviderConfig(secondaryProvider);
  const canPrimary = !!primaryCfg?.apiKey;
  const canSecondary = !!secondaryCfg?.apiKey && secondaryProvider !== primaryProvider;

  if (!canPrimary && !canSecondary) throw new Error('未配置可用的大模型服务商（API Key 缺失）');

  const runProvider = async (p: 'doubao' | 'aliyun' | 'zhipu') => {
    const extracted = await analyzeExtractTextWithProvider(ocrText, prompt, p, emit);
    return { extracted, usedProvider: p as any };
  };

  let settled = false;
  let primaryDone = false;
  let secondaryStarted = false;
  let primaryErr: any = null;
  let secondaryErr: any = null;

  return new Promise((resolve, reject) => {
    const finalizeResolve = (v: { extracted: any; usedProvider: any }) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };
    const finalizeReject = (e: any) => {
      if (settled) return;
      settled = true;
      reject(e);
    };

    let timer: any = null;
    const startSecondary = () => {
      if (secondaryStarted) return;
      secondaryStarted = true;
      if (!canSecondary || !hedgeEnabled) return;
      runProvider(secondaryProvider as any)
        .then((v) => finalizeResolve(v))
        .catch((e) => {
          secondaryErr = e;
          if (primaryDone) {
            finalizeReject(primaryErr || secondaryErr);
          }
        });
    };

    if (canPrimary) {
      timer = setTimeout(() => startSecondary(), hedgeAfterMs);
      runProvider(primaryProvider)
        .then((v) => {
          primaryDone = true;
          if (timer) clearTimeout(timer);
          finalizeResolve(v);
        })
        .catch((e) => {
          primaryDone = true;
          if (timer) clearTimeout(timer);
          primaryErr = e;
          startSecondary();
          if (!canSecondary || !hedgeEnabled) {
            finalizeReject(primaryErr);
          }
        });
    } else {
      primaryDone = true;
      primaryErr = new Error(`未配置 ${primaryProvider} 的 API Key`);
      startSecondary();
      if (!canSecondary || !hedgeEnabled) {
        finalizeReject(primaryErr);
      }
    }
  });
}

async function analyzeExtractWithProvider(
  req: ImageAnalyzeJobRequest,
  prompt: string,
  visionProvider: 'doubao' | 'aliyun' | 'zhipu',
  emit: (ev: ImageAnalyzeJobEvent) => void
): Promise<any> {
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS || 0);
  const retryCount = Math.max(0, Number(process.env.LLM_RETRY_COUNT || 1));
  const retryBaseDelayMs = Math.max(0, Number(process.env.LLM_RETRY_BASE_DELAY_MS || 800));

  emit({ type: 'progress', stage: 'extracting', provider: visionProvider, message: '开始解析图片', at: Date.now() });

  const rawContent = await callWithRetry(
    () =>
      withTimeout(
        llmService.generateImageAnalysis(req.images, prompt, visionProvider as any, { temperature: 0.2 }),
        timeoutMs,
        '图片解析超时'
      ),
    retryCount,
    retryBaseDelayMs
  );

  let parsed = parseLlmJson(rawContent);
  if (parsed.ok) {
    try {
      normalizeMetaNumbers((parsed.value as any)?.meta);
    } catch {}
  }
  if (!parsed.ok || validateExtractJson(parsed.value).ok === false) {
    emit({ type: 'progress', stage: 'extracting', provider: visionProvider, message: '修复结构化结果', at: Date.now() });
    const repairPrompt = `
你刚才的输出不是合法 JSON 或结构不完整。请把下面内容转换为“严格合法 JSON”，只输出 JSON 本体，不要解释，不要 Markdown 代码块。

必须满足结构：
- meta.examName (string)
- meta.subject (string)
- meta.score (number)
- meta.fullScore (number)
- meta.typeAnalysis (array of {type, score, full})
- meta.paperAppearance (object)
- observations.problems (string[])

原始输出如下：
${rawContent}
`.trim();
    const repaired = await callWithRetry(
      () =>
        withTimeout(llmService.generateAnalysis(repairPrompt, visionProvider as any, { temperature: 0.1 }), timeoutMs, '修复超时'),
      retryCount,
      retryBaseDelayMs
    );
    parsed = parseLlmJson(repaired);
    if (parsed.ok) {
      try {
        normalizeMetaNumbers((parsed.value as any)?.meta);
      } catch {}
    }
  }

  if (!parsed.ok) throw parsed.error;
  const v = validateExtractJson(parsed.value);
  if (!v.ok) throw new Error(`结果结构不完整: ${v.reason}`);
  return parsed.value;
}

async function analyzeExtractWithHedge(
  req: ImageAnalyzeJobRequest,
  prompt: string,
  primaryProvider: 'doubao' | 'aliyun' | 'zhipu',
  emit: (ev: ImageAnalyzeJobEvent) => void
): Promise<{ extracted: any; usedProvider: 'doubao' | 'aliyun' | 'zhipu' }> {
  const envSecondary = String(process.env.HEDGE_SECONDARY_PROVIDER || '').trim();
  const secondaryProvider = (envSecondary as any) || pickSecondaryProvider(primaryProvider);

  const hedgeEnabled = String(process.env.HEDGE_ENABLED || '1').trim() !== '0';
  const baseHedgeAfterMs = Math.max(0, Number(process.env.HEDGE_AFTER_MS || 3800));
  const perImageMs = Math.max(0, Number(process.env.HEDGE_AFTER_MS_PER_IMAGE || 450));
  const imgCount = Array.isArray(req.images) ? req.images.length : 0;
  const hedgeAfterMs = Math.min(15000, Math.max(1500, baseHedgeAfterMs + imgCount * perImageMs));

  const primaryCfg = llmService.getProviderConfig(primaryProvider);
  const secondaryCfg = llmService.getProviderConfig(secondaryProvider);
  const canPrimary = !!primaryCfg?.apiKey;
  const canSecondary = !!secondaryCfg?.apiKey && secondaryProvider !== primaryProvider;

  if (!canPrimary && !canSecondary) throw new Error('未配置可用的大模型服务商（API Key 缺失）');

  const runProvider = async (p: 'doubao' | 'aliyun' | 'zhipu') => {
    const extracted = await analyzeExtractWithProvider(req, prompt, p, emit);
    return { extracted, usedProvider: p as any };
  };

  let settled = false;
  let primaryDone = false;
  let secondaryStarted = false;
  let primaryErr: any = null;
  let secondaryErr: any = null;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => startSecondary(), hedgeAfterMs);

    const finalizeResolve = (v: any) => {
      if (settled) return;
      settled = true;
      try {
        clearTimeout(timer);
      } catch {}
      resolve(v);
    };

    const finalizeReject = (e: any) => {
      if (settled) return;
      settled = true;
      try {
        clearTimeout(timer);
      } catch {}
      reject(e);
    };

    const startSecondary = () => {
      if (settled || secondaryStarted || !hedgeEnabled || !canSecondary) return;
      secondaryStarted = true;
      runProvider(secondaryProvider)
        .then((v) => finalizeResolve(v))
        .catch((e) => {
          secondaryErr = e;
          if (primaryDone) finalizeReject(primaryErr || secondaryErr);
        });
    };

    if (canPrimary) {
      runProvider(primaryProvider)
        .then((v) => {
          primaryDone = true;
          finalizeResolve(v);
        })
        .catch((e) => {
          primaryDone = true;
          primaryErr = e;
          startSecondary();
          if (!canSecondary || !hedgeEnabled) finalizeReject(primaryErr);
        });
    } else {
      primaryDone = true;
      primaryErr = new Error(`未配置 ${primaryProvider} 的 API Key`);
      startSecondary();
      if (!canSecondary || !hedgeEnabled) finalizeReject(primaryErr);
    }
  });
}

async function analyzeImagesWithProvider(
  req: ImageAnalyzeJobRequest,
  visionPrompt: string,
  visionProvider: 'doubao' | 'aliyun' | 'zhipu',
  emit: (ev: ImageAnalyzeJobEvent) => void
): Promise<any> {
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS || 0);
  const retryCount = Math.max(0, Number(process.env.LLM_RETRY_COUNT || 1));
  const retryBaseDelayMs = Math.max(0, Number(process.env.LLM_RETRY_BASE_DELAY_MS || 800));

  emit({ type: 'progress', stage: 'extracting', provider: visionProvider, message: '开始解析图片', at: Date.now() });

  const rawContent = await callWithRetry(
    () =>
      withTimeout(
        llmService.generateImageAnalysis(req.images, visionPrompt, visionProvider as any, { temperature: 0.2 }),
        timeoutMs,
        '图片分析调用超时'
      ),
    retryCount,
    retryBaseDelayMs
  );

  let parsed = parseLlmJson(rawContent);
  if (!parsed.ok || validateVisionJson(parsed.value).ok === false) {
    emit({ type: 'progress', stage: 'extracting', provider: visionProvider, message: '修复结构化结果', at: Date.now() });
    const repairPrompt = `
你刚才的输出不是合法 JSON 或结构不完整。请把下面内容转换为“严格合法 JSON”，只输出 JSON 本体，不要解释，不要 Markdown 代码块。

必须满足结构：
- meta.examName (string)
- meta.subject (string)
- meta.score (number)
- meta.fullScore (number)
- meta.typeAnalysis (array of {type, score, full})
- meta.paperAppearance (object)
- forStudent.overall (string)
- forStudent.problems (string[])
- forStudent.advice (string[])
- studyMethods.methods (string[])
- studyMethods.weekPlan (string[])
- forParent (object，可为空)
- practicePaper (object，可为空)
- review (object，可为空)
- acceptanceQuiz (object，可为空)

原始输出如下：
${rawContent}
`.trim();

    const repaired = await callWithRetry(
      () =>
        withTimeout(
          llmService.generateAnalysis(repairPrompt, visionProvider as any, { temperature: 0.1 }),
          timeoutMs,
          '图片分析结果修复超时'
        ),
      retryCount,
      retryBaseDelayMs
    );

    parsed = parseLlmJson(repaired);
  }

  if (!parsed.ok) {
    throw parsed.error;
  }
  const v = validateVisionJson(parsed.value);
  if (!v.ok) {
    throw new Error(`结果结构不完整: ${v.reason}`);
  }
  return parsed.value;
}

async function analyzeImagesWithHedge(
  req: ImageAnalyzeJobRequest,
  visionPrompt: string,
  emit: (ev: ImageAnalyzeJobEvent) => void
): Promise<{ reportJson: any; usedProvider: 'doubao' | 'aliyun' | 'zhipu' }> {
  const primaryProvider = (req.provider as any) || (process.env.DEFAULT_PROVIDER as any) || 'doubao';
  const envSecondary = String(process.env.HEDGE_SECONDARY_PROVIDER || '').trim();
  const fallbackSecondary = pickSecondaryProvider(primaryProvider);
  const secondaryProvider = (envSecondary as any) || fallbackSecondary;

  const hedgeEnabled = String(process.env.HEDGE_ENABLED || '1').trim() !== '0';
  const baseHedgeAfterMs = Math.max(0, Number(process.env.HEDGE_AFTER_MS || 3800));
  const perImageMs = Math.max(0, Number(process.env.HEDGE_AFTER_MS_PER_IMAGE || 450));
  const imgCount = Array.isArray(req.images) ? req.images.length : 0;
  const hedgeAfterMs = Math.min(15000, Math.max(1500, baseHedgeAfterMs + imgCount * perImageMs));

  const primaryCfg = llmService.getProviderConfig(primaryProvider);
  const secondaryCfg = llmService.getProviderConfig(secondaryProvider);
  const canPrimary = !!primaryCfg?.apiKey;
  const canSecondary = !!secondaryCfg?.apiKey && secondaryProvider !== primaryProvider;

  if (!canPrimary && !canSecondary) {
    throw new Error('未配置可用的大模型服务商（API Key 缺失）');
  }

  const runProvider = async (p: 'doubao' | 'aliyun' | 'zhipu') => {
    const reportJson = await analyzeImagesWithProvider(req, visionPrompt, p, emit);
    return { reportJson, usedProvider: p as any };
  };

  let settled = false;
  let primaryDone = false;
  let secondaryStarted = false;
  let primaryErr: any = null;
  let secondaryErr: any = null;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      startSecondary();
    }, hedgeAfterMs);

    const finalizeResolve = (v: any) => {
      if (settled) return;
      settled = true;
      try {
        clearTimeout(timer);
      } catch {}
      resolve(v);
    };

    const finalizeReject = (e: any) => {
      if (settled) return;
      settled = true;
      try {
        clearTimeout(timer);
      } catch {}
      reject(e);
    };

    const startSecondary = () => {
      if (settled || secondaryStarted || !hedgeEnabled || !canSecondary) return;
      secondaryStarted = true;
      runProvider(secondaryProvider)
        .then((v) => {
          finalizeResolve(v);
        })
        .catch((e) => {
          secondaryErr = e;
          if (primaryDone) {
            finalizeReject(primaryErr || secondaryErr);
          }
        });
    };

    if (canPrimary) {
      runProvider(primaryProvider)
        .then((v) => {
          primaryDone = true;
          finalizeResolve(v);
        })
        .catch((e) => {
          primaryDone = true;
          primaryErr = e;
          startSecondary();
          if (!canSecondary || !hedgeEnabled) {
            finalizeReject(primaryErr);
          }
        });
    } else {
      primaryDone = true;
      primaryErr = new Error(`未配置 ${primaryProvider} 的 API Key`);
      startSecondary();
      if (!canSecondary || !hedgeEnabled) {
        finalizeReject(primaryErr);
      }
    }
  });
}

async function runImageAnalyzeJob(jobId: string) {
  const job = imageAnalyzeJobs.get(jobId);
  if (!job) return;
  if (job.status === 'canceled') return;

  const isCanceled = () => imageAnalyzeJobs.get(jobId)?.status === 'canceled';

  const emit = (ev: ImageAnalyzeJobEvent) => {
    if (isCanceled()) return;
    broadcastSse(jobId, ev);
  };

  const setSnapshot = (stage: ImageAnalyzeJobStage) => {
    job.stage = stage;
    job.updatedAt = Date.now();
    broadcastSse(jobId, {
      type: 'snapshot',
      job: {
        id: job.id,
        status: job.status,
        stage: job.stage,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        errorMessage: job.errorMessage,
        imageCount: job.imageCount,
        estimateSeconds: job.estimateSeconds,
      },
    });
  };

  const shouldBypassCache = job.bypassCache === true;
  if (!job.cacheKey) {
    try {
      job.cacheKey = computeImageAnalyzeCacheKey(job.request);
    } catch {}
  }
  if (!shouldBypassCache && job.cacheKey) {
    const cached = getCachedImageAnalyzeResult(job.cacheKey);
    if (cached) {
      job.status = 'completed';
      job.stage = 'completed';
      job.result = cached;
      job.partialResult = undefined;
      job.errorMessage = undefined;
      job.updatedAt = Date.now();
      broadcastSse(jobId, {
        type: 'snapshot',
        job: {
          id: job.id,
          status: job.status,
          stage: job.stage,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
          imageCount: job.imageCount,
          estimateSeconds: job.estimateSeconds,
        },
      });
      broadcastSse(jobId, { type: 'result', result: cached, at: Date.now() });
      return;
    }
  }

  job.bypassCache = false;
  job.status = 'running';
  job.errorMessage = undefined;
  setSnapshot('extracting');

  const { subject, grade } = job.request;
  const ocrText = pickOcrText(job.request);
  const extractPrompt = `
${subject ? `【重要提示】已知该试卷学科为：${subject}，请务必基于此学科视角进行解析。` : ''}
${grade ? `【重要提示】学生年级为：${grade}，请参考此学段的认知水平。` : ''}

你将收到多张试卷图片。请只做“信息提取”，不要生成完整报告，不要生成练习卷。

合规要求：
- 严禁直接给出完整解题步骤或作文终稿。
- 允许给“最小提示链”，但必须分三层：审题提示、思路提示、关键一步起始（不出现最终答案）。
- 每条问题必须有证据；证据不足必须给出低置信度并建议补拍/老师确认。

请输出严格 JSON（不要包含 Markdown 代码块）：
{
  "meta": {
    "examName": "试卷标题",
    "subject": "数学",
    "score": 85,
    "fullScore": 100,
    "typeAnalysis": [
      { "type": "计算题", "score": 28, "full": 30 }
    ],
    "paperAppearance": { "rating": "工整", "content": "书写认真..." }
  },
  "observations": {
    "problems": [
      "【知识点】一次函数图像【题号】3(2)【得分】0/2【错因】读图时忽略坐标含义【证据】第2小题坐标读取与图像不一致【置信度】中【最短改法】读图时先标出横纵轴含义并写出对应点坐标"
    ]
  }
}
`.trim();

  const extractTextPrompt = ocrText
    ? `
${subject ? `【重要提示】已知该试卷学科为：${subject}，请务必基于此学科视角进行解析。` : ''}
${grade ? `【重要提示】学生年级为：${grade}，请参考此学段的认知水平。` : ''}

你将收到试卷的 OCR 文本。请只做“信息提取”，不要生成完整报告，不要生成练习卷。

说明：
- OCR 可能包含错字/缺行/顺序错乱；请以“尽可能准确 + 保守”为原则。
- 如果无法从 OCR 中确定题号/得分/满分，请标为低置信度并给出补拍/老师确认建议。

合规要求：
- 严禁直接给出完整解题步骤或作文终稿。
- 允许给“最小提示链”，但必须分三层：审题提示、思路提示、关键一步起始（不出现最终答案）。
- 每条问题必须有证据；证据不足必须给出低置信度并建议补拍/老师确认。

请输出严格 JSON（不要包含 Markdown 代码块）：
{
  "meta": {
    "examName": "试卷标题",
    "subject": "数学",
    "score": 85,
    "fullScore": 100,
    "typeAnalysis": [
      { "type": "计算题", "score": 28, "full": 30 }
    ],
    "paperAppearance": { "rating": "工整", "content": "书写认真..." }
  },
  "observations": {
    "problems": [
      "【知识点】一次函数图像【题号】3(2)【得分】0/2【错因】读图时忽略坐标含义【证据】第2小题坐标读取与图像不一致【置信度】中【最短改法】读图时先标出横纵轴含义并写出对应点坐标"
    ]
  }
}
`.trim()
    : '';

  try {
    const providers = resolveStageProviders(job.request);
    const extractedPack = ocrText
      ? await analyzeExtractTextWithHedge(ocrText, extractTextPrompt, providers.extract, emit)
      : await analyzeExtractWithHedge(job.request, extractPrompt, providers.extract, emit);
    const extracted = extractedPack.extracted;
    if (isCanceled()) {
      return;
    }

    const extractedMeta = extracted?.meta || {};
    const extractedProblems = extracted?.observations?.problems || [];
    const effectiveSubject = String(extractedMeta?.subject || subject || '').trim();

    // Parallel Execution: Diagnosis & Practice
    setSnapshot('diagnosing'); 

    const diagnosisPrompt = `
你是一位经验丰富的特级教师。基于下面“试卷信息提取结果”，生成面向学生与家长的核心结论与行动建议。

要求：
- 不要编造题号或得分；如果信息不足，保持谨慎并提示补拍/老师确认。
- 语言温暖积极、可执行。
- 输出严格 JSON（不要包含 Markdown 代码块）。

【已提取信息】：
${JSON.stringify(extracted, null, 2)}

输出结构：
{
  "review": { "required": false, "reason": "", "suggestions": [] },
  "forStudent": {
    "overall": "整体评价（3-6句）",
    "advice": ["【基础巩固】...", "【专项训练】...", "【习惯养成】..."]
  },
  "studyMethods": {
    "methods": ["更高效的做法（4-6条）"],
    "weekPlan": ["接下来7天微计划（5-7条）"]
  },
  "forParent": {
    "summary": "家长可读总结（2-4句）",
    "guidance": "家长督学建议（3-5句）"
  }
}
`.trim();

    const diagnosisTask = generateTextJsonWithRepair(
      diagnosisPrompt,
      providers.diagnose,
      'diagnosing',
      emit,
      validateDiagnosisJson,
      `- review (object)\n- forStudent.overall (string)\n- forStudent.advice (string[])\n- studyMethods.methods (string[])\n- studyMethods.weekPlan (string[])\n- forParent (object)`
    );

    const practicePrompt = `
请基于下面信息，为学生生成一份“针对性巩固练习卷”和“验收小测”。

要求：
- 题目必须可直接作答（完整题干/数值/设问），不要只写概括。
- 每道题提供 hints（三层：审题提示、思路提示、关键一步起始），不出现最终答案。
- 输出严格 JSON（不要包含 Markdown 代码块）。

【试卷信息提取】：
${JSON.stringify(extracted, null, 2)}

${effectiveSubject ? getSubjectPracticeInstruction(effectiveSubject) : ''}

输出结构：
{
  "practicePaper": {
    "title": "针对性巩固练习卷",
    "sections": [
      { "name": "一、...", "questions": [ { "no": 1, "content": "...", "hints": ["..."] } ] }
    ]
  },
  "acceptanceQuiz": {
    "title": "验收小测",
    "passRule": "3题全对",
    "questions": [ { "no": 1, "content": "...", "hints": ["..."] } ]
  }
}
`.trim();

    const practiceTask = generateTextJsonWithRepair(
      practicePrompt,
      providers.practice,
      'practicing',
      emit,
      validatePracticeJson,
      `- practicePaper (object)\n- acceptanceQuiz (object)`
    );

    const [diagnosis, practice] = await Promise.all([diagnosisTask, practiceTask]);

    const buildResponse = (opts: { practice?: any; diagnosis?: any } = {}): AnalyzeExamResponse => {
      const meta = { ...(extractedMeta || {}) };
      if (!String((meta as any)?.subject || '').trim() && effectiveSubject) (meta as any).subject = effectiveSubject;
      const diag = opts.diagnosis || {};
      const prac = opts.practice || {};
      
      const reportJson = {
        meta,
        review: diag.review,
        forStudent: {
          ...(diag.forStudent || {}),
          problems: Array.isArray(extractedProblems) ? extractedProblems : [],
        },
        studyMethods: diag.studyMethods,
        forParent: diag.forParent,
        practicePaper: prac.practicePaper,
        acceptanceQuiz: prac.acceptanceQuiz,
      };
      return {
        success: true,
        data: {
          summary: {
            totalScore: meta.score || 0,
            rank: 0,
            beatPercentage: 0,
            strongestKnowledge: '基于图像分析',
            weakestKnowledge: '基于图像分析',
          },
          report: {
            forStudent: reportJson.forStudent || {},
            forParent: reportJson.forParent || {},
          },
          studyMethods: reportJson.studyMethods,
          examName: meta.examName,
          typeAnalysis: meta.typeAnalysis || [],
          paperAppearance: meta.paperAppearance,
          subject: meta.subject,
          review: reportJson.review,
          rawLlmOutput: JSON.stringify(reportJson),
          practiceQuestions: [],
          practicePaper: reportJson.practicePaper,
          acceptanceQuiz: reportJson.acceptanceQuiz,
        },
      };
    };

    setSnapshot('merging');
    const response = buildResponse({ practice, diagnosis });

    job.result = response;
    job.partialResult = undefined;
    job.status = 'completed';
    setSnapshot('completed');

    if (job.cacheKey) {
      try {
        setCachedImageAnalyzeResult(job.cacheKey, response);
      } catch {}
    }
    emit({ type: 'result', result: response, at: Date.now() });
  } catch (e: any) {
    const msg = String(e?.message || e || '未知错误');
    if (!isCanceled()) {
      job.status = 'failed';
      job.stage = 'failed';
      job.errorMessage = msg;
      job.partialResult = undefined;
      job.updatedAt = Date.now();
      broadcastSse(jobId, {
        type: 'snapshot',
        job: {
          id: job.id,
          status: job.status,
          stage: job.stage,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
          errorMessage: msg,
          imageCount: job.imageCount,
          estimateSeconds: job.estimateSeconds,
        },
      });
      broadcastSse(jobId, { type: 'error', stage: 'failed', errorMessage: msg, at: Date.now() });
    }
  }
}

function loadLlmConfigFromFile() {
  try {
    if (!fs.existsSync(LLM_CONFIG_PATH)) return;
    const raw = fs.readFileSync(LLM_CONFIG_PATH, 'utf-8');
    const json = JSON.parse(raw);
    const providers: ('doubao' | 'aliyun' | 'zhipu')[] = ['doubao', 'aliyun', 'zhipu'];
    providers.forEach((p) => {
      if (json[p]) {
        llmService.setProviderConfig(p, {
          apiKey: json[p].apiKey,
          baseURL: json[p].baseURL,
          model: json[p].model,
        });
      }
    });
    if (json.defaultProvider) {
      process.env.DEFAULT_PROVIDER = json.defaultProvider;
    }
    console.log('✅ 已从 llm.json 载入大模型配置');
  } catch (err) {
    console.error('⚠️ 载入 llm.json 失败:', err);
  }
}

loadLlmConfigFromFile();

// 1. 中间件配置
app.use(cors()); // 允许跨域
app.use(bodyParser.json({ limit: '50mb' })); // 支持大 JSON (图片 Base64)

app.use((err: any, req: any, res: any, next: any) => {
  const isSyntaxError = err instanceof SyntaxError;
  const hasBody = err && typeof err === 'object' && 'body' in err;
  if (isSyntaxError && hasBody) {
    return res.status(400).json({ success: false, errorMessage: '请求体不是合法 JSON' });
  }
  if (err && typeof err === 'object' && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({ success: false, errorMessage: '请求体过大，请减少图片数量或压缩图片' });
  }
  return next(err);
});

const rateBuckets = new Map<string, number[]>();
const dailyCounts = new Map<string, number>();
const getLocalDayKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
let currentDay = getLocalDayKey(new Date());

app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) return next();

  const today = getLocalDayKey(new Date());
  if (today !== currentDay) {
    currentDay = today;
    rateBuckets.clear();
    dailyCounts.clear();
  }

  const requiredRaw = String(process.env.TRIAL_ACCESS_CODES || process.env.TRIAL_ACCESS_CODE || '').trim();
  const requiredCodes = requiredRaw
    ? requiredRaw.split(',').map(s => s.trim()).filter(Boolean)
    : [];
  const gotCode = String(req.headers['x-access-code'] || (req.query as any)?.accessCode || '').trim();

  if (requiredCodes.length > 0 && !requiredCodes.includes(gotCode)) {
    return res.status(401).json({ success: false, errorMessage: '访问口令错误或缺失' });
  }

  const forwarded = String(req.headers['x-forwarded-for'] || '');
  const ip = (forwarded.split(',')[0] || req.ip || '').trim();

  const limitWindowMs = 60 * 1000;
  const now = Date.now();
  const perCodePerMinute = Math.max(1, Number(process.env.RATE_LIMIT_PER_MINUTE_PER_CODE || 12));
  const perIpPerMinute = Math.max(1, Number(process.env.RATE_LIMIT_PER_MINUTE_PER_IP || 8));
  const perCodePerDay = Math.max(1, Number(process.env.DAILY_QUOTA_PER_CODE || 300));
  const perIpPerDay = Math.max(1, Number(process.env.DAILY_QUOTA_PER_IP || 60));

  const rateCheck = (key: string, maxPerMinute: number) => {
    const arr = rateBuckets.get(key) || [];
    const fresh = arr.filter(t => now - t < limitWindowMs);
    if (fresh.length >= maxPerMinute) {
      return false;
    }
    fresh.push(now);
    rateBuckets.set(key, fresh);
    return true;
  };

  const dailyCheck = (key: string, maxPerDay: number) => {
    const count = dailyCounts.get(key) || 0;
    if (count >= maxPerDay) {
      return false;
    }
    dailyCounts.set(key, count + 1);
    return true;
  };

  const buildDailyQuotaResponse = () => {
    const resetAt = new Date(now);
    resetAt.setHours(24, 0, 0, 0);
    const retryAfterSeconds = Math.max(60, Math.ceil((resetAt.getTime() - now) / 1000));
    res.setHeader('Retry-After', String(retryAfterSeconds));
    const hh = String(resetAt.getHours()).padStart(2, '0');
    const mm = String(resetAt.getMinutes()).padStart(2, '0');
    return res.status(429).json({
      success: false,
      errorCode: 'DAILY_QUOTA_EXCEEDED',
      errorMessage: `今日使用额度已用完，将于 ${hh}:${mm} 重置`,
      resetAt: resetAt.toISOString(),
      retryAfterSeconds,
    });
  };

  if (requiredCodes.length > 0) {
    const codeRateKey = `code:${gotCode}`;
    const codeDailyKey = `day:${today}:code:${gotCode}`;
    if (!rateCheck(codeRateKey, perCodePerMinute)) {
      res.setHeader('Retry-After', '60');
      return res.status(429).json({ success: false, errorMessage: '请求过于频繁，请稍后再试' });
    }
    if (!dailyCheck(codeDailyKey, perCodePerDay)) {
      return buildDailyQuotaResponse();
    }
  }

  if (ip) {
    const ipRateKey = `ip:${ip}`;
    const ipDailyKey = `day:${today}:ip:${ip}`;
    if (!rateCheck(ipRateKey, perIpPerMinute)) {
      res.setHeader('Retry-After', '60');
      return res.status(429).json({ success: false, errorMessage: '请求过于频繁，请稍后再试' });
    }
    if (!dailyCheck(ipDailyKey, perIpPerDay)) {
      return buildDailyQuotaResponse();
    }
  }

  next();
});

// 1.5 根路径健康检查
app.get('/healthz', (req, res) => {
  res.status(200).json({ ok: true, version: 'V3' });
});

app.get('/', (req, res, next) => {
  if (HAS_WEB_DIST) return next();
  res.send(`
    <h1>试卷分析助手后端服务</h1>
    <p>状态: 🟢 运行中 (V3)</p>
    <p>API 接口: <code>POST /api/analyze-exam</code></p>
    <p>当前时间: ${new Date().toLocaleString()}</p>
  `);
});

// 2. 管理员大模型配置接口
app.post('/api/admin/llm-config', (req, res) => {
  try {
    const { adminPassword, provider, apiKey, modelId, baseURL } = req.body || {};
    const configuredPassword = process.env.ADMIN_PASSWORD;
    if (!configuredPassword) {
      return res.status(500).json({ success: false, errorMessage: '未配置 ADMIN_PASSWORD，无法使用管理接口' });
    }
    if (!adminPassword || adminPassword !== configuredPassword) {
      return res.status(401).json({ success: false, errorMessage: '管理员密码错误' });
    }

    const p: 'doubao' | 'aliyun' | 'zhipu' = provider || (process.env.DEFAULT_PROVIDER as any) || 'doubao';
    const current = llmService.getProviderConfig(p);

    llmService.setProviderConfig(p, {
      apiKey: apiKey || current.apiKey,
      model: modelId || current.model,
      baseURL: baseURL || current.baseURL,
    });

    let stored: any = {};
    if (fs.existsSync(LLM_CONFIG_PATH)) {
      try {
        const raw = fs.readFileSync(LLM_CONFIG_PATH, 'utf-8');
        stored = JSON.parse(raw);
      } catch {
        stored = {};
      }
    }

    stored[p] = {
      apiKey: apiKey || current.apiKey,
      model: modelId || current.model,
      baseURL: baseURL || current.baseURL,
    };
    stored.defaultProvider = p;

    fs.writeFileSync(LLM_CONFIG_PATH, JSON.stringify(stored, null, 2), 'utf-8');

    return res.json({ success: true });
  } catch (err: any) {
    console.error('❌ 管理接口处理失败:', err);
    return res.status(500).json({ success: false, errorMessage: '服务器内部错误' });
  }
});

// 3. 核心分析接口
app.post('/api/analyze-exam', async (req, res) => {
  try {
    const data = req.body as AnalyzeExamRequest;

    if (
      !data ||
      !data.student ||
      !data.exam ||
      !data.score ||
      !data.questions ||
      !Array.isArray(data.questions) ||
      !data.classStats ||
      !data.modelProvider
    ) {
      return res.status(400).json({
        success: false,
        errorMessage: '请求体缺少必要字段（student/exam/score/questions/classStats/modelProvider）',
      });
    }

    const studentName = String((data as any).student?.name || '').trim();
    const subjectName = String((data as any).exam?.subject || '').trim();
    if (!studentName || !subjectName) {
      return res.status(400).json({
        success: false,
        errorMessage: '请求体字段不完整（student.name / exam.subject）',
      });
    }

    console.log(`\n📨 收到分析请求: ${studentName} - ${subjectName}`);

    // --- Step A: 构造 Prompt (复用之前的逻辑) ---
    // 构造题目详情字符串
    let questionDetailListStr = '';
    const questionScores: Record<string, number> =
      (data.score && typeof (data.score as any).questionScores === 'object' && (data.score as any).questionScores) || {};
    const questionAverages: Record<string, number> =
      (data.classStats &&
        typeof (data.classStats as any).questionAverages === 'object' &&
        (data.classStats as any).questionAverages) ||
      {};

    data.questions.forEach(q => {
      const studentScore = questionScores[q.no] || 0;
      const classAvg = questionAverages[q.no] || 0;
      questionDetailListStr += `- 题${q.no} (${q.type}, ${q.knowledgePoint}): 满分${q.score}, 学生得分${studentScore}, 班级平均${classAvg}\n`;
    });

    // 填充 Prompt 模板
    const classAverage = (data.classStats as any)?.averageScore ?? (data.classStats as any)?.average ?? 0;
    const studentCount = (data.classStats as any)?.studentCount ?? (data.classStats as any)?.classSize ?? 0;
    const prompt = USER_PROMPT_TEMPLATE
      .replace('{{studentName}}', data.student.name)
      .replace('{{grade}}', data.student.grade)
      .replace('{{subject}}', data.exam.subject)
      .replace('{{examTitle}}', data.exam.title)
      .replace('{{totalScore}}', String(data.score.totalScore))
      .replace('{{fullScore}}', String(data.exam.fullScore))
      .replace('{{classAverage}}', String(classAverage))
      .replace('{{rank}}', String(data.score.classRank || '未统计'))
      .replace('{{studentCount}}', String(studentCount))
      .replace('{{questionDetailList}}', questionDetailListStr)
      .replace('{{gradeLevelInstruction}}', getGradeLevelInstruction(data.student.grade))
      .replace('{{subjectAnalysisInstruction}}', getSubjectAnalysisInstruction(data.exam.subject))
      .replace('{{subjectPracticeInstruction}}', getSubjectPracticeInstruction(data.exam.subject));

    console.log('📝 生成 Prompt 长度:', prompt.length);

    // --- Step B: 调用真实大模型 ---
    console.log(`📡 正在调用 ${data.modelProvider} (真实API)...`);
    
    let reportJson: any;
    try {
      // 1. 发起调用
      const timeoutMs = Number(process.env.LLM_TIMEOUT_MS || 0);
      const rawContent = await withTimeout(
        llmService.generateAnalysis(prompt, data.modelProvider, { temperature: 0.6 }),
        timeoutMs,
        '大模型调用超时'
      );
      console.log('✅ 大模型返回原始内容长度:', rawContent.length);

      // 2. 尝试解析 JSON
      const parsed = parseLlmJson(rawContent);
      if (!parsed.ok) {
        throw parsed.error;
      }
      reportJson = parsed.value;

    } catch (llmError: any) {
      console.error('❌ 大模型调用或解析失败:', llmError);
      // 降级处理：如果失败，返回一个兜底的错误报告
      reportJson = {
        forStudent: {
          overall: "系统暂时无法连接智能分析服务，请检查 API 配置。",
          problems: ["调用失败"],
          advice: ["请联系管理员"]
        },
        forParent: {
          summary: "分析服务暂时不可用。",
          guidance: "请稍后重试。"
        },
        studentView: {
          overallComment: "系统暂时无法连接智能分析服务，请检查 API 配置。",
          problems: ["调用失败"],
          advice: ["请联系管理员"]
        },
        parentView: {
          summary: "分析服务暂时不可用。",
          guidance: "请稍后重试。"
        },
      };
    }

    // --- Step C: 构造响应 ---
    const normalizedForStudent = reportJson.forStudent || reportJson.studentView || {};
    const normalizedForParent = reportJson.forParent || reportJson.parentView || {};
    const response: AnalyzeExamResponse = {
      success: true,
      data: {
        summary: {
          totalScore: data.score.totalScore,
          rank: data.score.classRank || 0,
          beatPercentage: 85,
          strongestKnowledge: "自动分析中",
          weakestKnowledge: "自动分析中"
        },
        report: {
          forStudent: {
            overall: normalizedForStudent.overall || normalizedForStudent.overallComment || '解析异常',
            problems: normalizedForStudent.problems || [],
            advice: normalizedForStudent.advice || normalizedForStudent.studyPlan || []
          },
          forParent: {
            summary: normalizedForParent.summary || '解析异常',
            guidance: normalizedForParent.guidance || normalizedForParent.homeSupportAdvice || ''
          }
        },
        studyMethods: reportJson.studyMethods,
        rawLlmOutput: JSON.stringify(reportJson),
        review: reportJson.review,
        practiceQuestions: reportJson.practiceQuestions || normalizedForStudent.practiceQuestions || [],
        practicePaper: reportJson.practicePaper,
        acceptanceQuiz: reportJson.acceptanceQuiz
      }
    };

    console.log('✅ 分析完成，返回结果');
    res.json(response);

  } catch (error) {
    console.error('❌ 处理请求失败:', error);
    res.status(500).json({
      success: false,
      errorMessage: '服务器内部错误'
    });
  }
});

// 2.6 精准训练生成接口 (V3.0) - Moved up for testing
app.post('/api/generate-practice', async (req, res) => {
  try {
    const { weakPoint, wrongQuestion, subject, grade, provider } = req.body;

    if (!weakPoint) {
      return res.status(400).json({ success: false, errorMessage: '缺少 weakPoint 参数' });
    }

    console.log(`\n🏋️ 收到精准训练生成请求: ${subject || '未知学科'} - ${weakPoint}`);

    let prompt = '';
    const subjectLower = (subject || '').toLowerCase();

    if (subjectLower.includes('语文') || subjectLower.includes('chinese')) {
        prompt = `
请针对以下薄弱点，为${grade || '初中'}${subject || '语文'}学生生成 3 道针对性的专项训练题。

【薄弱点】：${weakPoint}
【原错题描述/错因】：${wrongQuestion || '（未提供详细描述，请基于薄弱点生成）'}

要求：
1. 题型设计要贴合语文特点：
   - 如果是作文/写作问题，请生成：① 一个具体的微写作题目（如片段练习）② 3个针对性的写作素材或金句 ③ 一个升格示例（修改前vs修改后）。
   - 如果是阅读理解问题，请生成：① 一个短小的阅读片段（约200字）② 2道针对该薄弱点的分析题（如概括、赏析、含义）。
   - 如果是基础知识（字词/病句/古诗文），请生成：① 3道选择题或填空题，覆盖易错点。
2. 每道题都要提供“思路提示”（hints），分三步引导（如：审题关键词->解题角度->答题规范）。
3. 确保输出为严格的 JSON 格式。

输出 JSON 格式（不要包含 Markdown 代码块）：
{
  "sectionName": "针对性强化训练：${weakPoint}",
  "questions": [
    { "no": 1, "content": "1. 题目内容...", "hints": ["提示1", "提示2"] },
    { "no": 2, "content": "2. 题目内容...", "hints": ["提示1", "提示2"] },
    { "no": 3, "content": "3. 题目内容...", "hints": ["提示1", "提示2"] }
  ]
}
`;
    } else if (subjectLower.includes('英语') || subjectLower.includes('english')) {
        prompt = `
请针对以下薄弱点，为${grade || '初中'}${subject || '英语'}学生生成 3 道针对性的专项训练题。

【薄弱点】：${weakPoint}
【原错题描述/错因】：${wrongQuestion || '（未提供详细描述，请基于薄弱点生成）'}

要求：
1. 题型设计要贴合英语特点：
   - 如果是语法问题（如时态、从句），请生成：① 2道单项选择题 ② 1道完成句子或改错题。
   - 如果是阅读/完形问题，请生成：① 一个短小的阅读片段（约100词）② 2道针对性的阅读理解题（如主旨、细节、推断）。
   - 如果是写作问题，请生成：① 一个具体的写作Topic ② 3个高分句型或短语推荐 ③ 一个开头段落示例。
2. 题目内容尽量使用地道的英语表达。
3. 每道题都要提供“思路提示”（hints），分三步引导（如：关键词定位->语法规则/上下文线索->排除法）。
4. 确保输出为严格的 JSON 格式。

输出 JSON 格式（不要包含 Markdown 代码块）：
{
  "sectionName": "针对性强化训练：${weakPoint}",
  "questions": [
    { "no": 1, "content": "1. 题目内容...", "hints": ["提示1", "提示2"] },
    { "no": 2, "content": "2. 题目内容...", "hints": ["提示1", "提示2"] },
    { "no": 3, "content": "3. 题目内容...", "hints": ["提示1", "提示2"] }
  ]
}
`;
    } else {
        // 默认数学/理科 Prompt
        prompt = `
请针对以下错题/薄弱点，为${grade || '初中'}${subject || '数学'}学生生成 3 道针对性的变式练习题。

【薄弱点】：${weakPoint}
【原错题描述/错因】：${wrongQuestion || '（未提供详细描述，请基于薄弱点生成）'}

要求：
1. 题目难度分层：第1题基础巩固，第2题变式训练，第3题拓展提升。
2. 必须提供完整题干、选项（如果是选择题）或填空位。
3. 每道题都要提供“思路提示”（hints），分三步引导，不直接给答案。
4. 确保输出为严格的 JSON 格式。

输出 JSON 格式（不要包含 Markdown 代码块）：
{
  "sectionName": "针对性强化训练：${weakPoint}",
  "questions": [
    { "no": 1, "content": "1. 题目内容...", "hints": ["提示1", "提示2"] },
    { "no": 2, "content": "2. 题目内容...", "hints": ["提示1", "提示2"] },
    { "no": 3, "content": "3. 题目内容...", "hints": ["提示1", "提示2"] }
  ]
}
`;
    }

    const modelProvider = (provider as any) || process.env.DEFAULT_PROVIDER || 'doubao';
    const timeoutMs = Number(process.env.LLM_TIMEOUT_MS || 0);

    const rawContent = await withTimeout(
      llmService.generateAnalysis(prompt, modelProvider as any, { temperature: 0.5 }),
      timeoutMs,
      '精准训练生成超时'
    );
    
    console.log('✅ 训练题生成长度:', rawContent.length);

    let parsed = parseLlmJson(rawContent);
    if (!parsed.ok) {
       console.warn('⚠️ JSON 解析失败，尝试修复...');
       const repairPrompt = `请修复以下 JSON，只输出 JSON 本体：\n${rawContent}`;
       const repaired = await withTimeout(
         llmService.generateAnalysis(repairPrompt, modelProvider as any, { temperature: 0.1 }),
         timeoutMs,
         '修复超时'
       );
       parsed = parseLlmJson(repaired);
    }

    if (!parsed.ok) {
       throw new Error('生成失败，无法解析为 JSON');
    }

    res.json({ success: true, data: parsed.value });

  } catch (error: any) {
    console.error('❌ 生成训练题失败:', error);
    res.status(500).json({ success: false, errorMessage: error.message });
  }
});

// 2.7 错题本-举一反三接口 (V3.1)
app.post('/api/generate-similar', async (req, res) => {
  try {
    const { questionText, knowledgePoints, count, provider, subject, grade } = req.body;
    const modelProvider = (provider as any) || process.env.DEFAULT_PROVIDER || 'doubao';
    
    const subjectText = String(subject || '').trim();
    const kpText = Array.isArray(knowledgePoints) ? knowledgePoints.join('、') : String(knowledgePoints || '').trim();
    const n = Math.max(1, Math.min(6, Number(count || 2) || 2));

    console.log(`\n🧩 收到举一反三生成请求: ${subjectText || '未指定'} - ${kpText || '综合'} - ${String(questionText || '').slice(0, 20)}...`);

    const subjectLower = subjectText.toLowerCase();
    const isChinese = subjectLower.includes('语文') || subjectLower.includes('chinese');
    const isEnglish = subjectLower.includes('英语') || subjectLower.includes('english');

    const looksLikeMath = (text: string) => {
      const t = String(text || '');
      if (/[=√×÷+\-]/.test(t)) return true;
      if (/\b(x|y|k)\b/i.test(t)) return true;
      if (/(方程|函数|不等式|一次函数|二次函数|坐标|几何|面积|体积|周长|角度|分数|小数|求解|解方程)/.test(t)) return true;
      if (/\d+\s*(\+|\-|\*|×|\/|÷)\s*\d+/.test(t)) return true;
      return false;
    };

    const isSubjectConsistent = (items: any[]) => {
      if (!isChinese) return true;
      return !items.some((it) => looksLikeMath(String(it?.question || '')));
    };

    const buildPrompt = (strict: boolean) => {
      if (isChinese) {
        return `
你是一位资深语文老师。请基于以下错题信息，生成 ${n} 道同类“举一反三”语文练习题，并给出标准答案与简要解析。

【学科】语文（必须严格保持语文学科，不得出现数学/方程/函数/计算等内容）
【年级】${String(grade || '').trim() || '未指定'}
【知识点】${kpText || '综合'}
【原题内容】${String(questionText || '').slice(0, 800)}

要求：
1. 题型必须贴合语文特点：字词拼写/词语辨析/病句修改/标点/阅读理解（短文+设问）/古诗文（默写或理解）等。
2. 题目难度与原题相当或略有变化，考点保持一致。
3. 每题提供“答案与解析”，解析简短明确。
4. 仅输出严格 JSON 数组（不要 Markdown），格式：
[
  { "question": "题目内容", "answer": "答案与解析" }
]
${strict ? '\n5. 严禁出现数学符号（如 x、y、=、+、-、÷ 等）或数学题型。若无法满足，请输出空数组 []。' : ''}
`.trim();
      }

      if (isEnglish) {
        return `
你是一位资深英语老师。请基于以下错题信息，生成 ${n} 道同类“举一反三”英语练习题，并给出标准答案与简要解析。

【学科】英语（必须严格保持英语学科）
【年级】${String(grade || '').trim() || '未指定'}
【知识点】${kpText || '综合'}
【原题内容】${String(questionText || '').slice(0, 800)}

要求：
1. 题型贴合英语：语法选择/改错/完形填空（短篇）/阅读理解（短文+设问）/句子翻译等。
2. 考点必须与知识点一致，难度相近。
3. 每题提供“答案与解析”。
4. 仅输出严格 JSON 数组（不要 Markdown）。
`.trim();
      }

      return `
你是一位资深出题老师。请基于以下错题信息，生成 ${n} 道同类“举一反三”变式练习题，并给出标准答案。

【学科】${subjectText || '未指定'}
【年级】${String(grade || '').trim() || '未指定'}
【知识点】${kpText || '综合'}
【原题内容】${String(questionText || '').slice(0, 800)}

要求：
1. 核心考点必须一致，但题目数字/条件/问法可以变化。
2. 难度可微调（一道稍易，一道稍难）。
3. 必须提供标准答案。
4. 仅输出严格 JSON 数组（不要 Markdown），格式：
[
  { "question": "题目内容", "answer": "答案内容" }
]
`.trim();
    };

    const timeoutMs = Number(process.env.LLM_TIMEOUT_MS || 0);
    const generateOnce = async (prompt: string) => {
      const rawContent = await withTimeout(
        llmService.generateAnalysis(prompt, modelProvider as any, { temperature: 0.6 }),
        timeoutMs,
        '变式题生成超时'
      );

      let parsed = parseLlmJson(rawContent);
      if (!parsed.ok) {
        console.warn('⚠️ JSON 解析失败，尝试修复...');
        const repairPrompt = `请修复以下 JSON，只输出 JSON 本体：\n${rawContent}`;
        const repaired = await withTimeout(
          llmService.generateAnalysis(repairPrompt, modelProvider as any, { temperature: 0.1 }),
          timeoutMs,
          '修复超时'
        );
        parsed = parseLlmJson(repaired);
      }

      if (!parsed.ok) return [];
      const arr = Array.isArray(parsed.value)
        ? parsed.value
        : Array.isArray((parsed.value as any)?.questions)
          ? (parsed.value as any).questions
          : parsed.value
            ? [parsed.value]
            : [];

      return arr
        .map((it: any) => ({
          question: String(it?.question || '').trim(),
          answer: String(it?.answer || '').trim(),
        }))
        .filter((it: any) => it.question);
    };

    let data = await generateOnce(buildPrompt(false));
    if (!isSubjectConsistent(data)) {
      data = await generateOnce(buildPrompt(true));
    }

    if (!data || data.length === 0) {
      throw new Error('生成失败，请稍后重试');
    }
    if (!isSubjectConsistent(data)) {
      throw new Error('生成内容与学科不匹配，请重试');
    }

    res.json({ success: true, data: data.slice(0, n) });

  } catch (error: any) {
    console.error('❌ 生成变式题失败:', error);
    res.status(500).json({ success: false, errorMessage: error.message });
  }
});

app.post('/api/analyze-images/jobs', async (req, res) => {
  try {
    const { images, provider, subject, grade, ocrTexts } = req.body || {};
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ success: false, errorMessage: '请上传至少一张图片' });
    }

    const id = (() => {
      try {
        return crypto.randomUUID();
      } catch {
        return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      }
    })();

    const now = Date.now();
    const imageCount = Array.isArray(images) ? images.length : 0;
    const request: ImageAnalyzeJobRequest = {
      images,
      provider,
      subject,
      grade,
      ...(Array.isArray(ocrTexts) ? { ocrTexts } : {}),
    };
    let cacheKey: string | undefined = undefined;
    try {
      cacheKey = computeImageAnalyzeCacheKey(request);
    } catch {}
    const cached = cacheKey ? getCachedImageAnalyzeResult(cacheKey) : null;

    const job: ImageAnalyzeJobRecord = {
      id,
      status: cached ? 'completed' : 'pending',
      stage: cached ? 'completed' : 'queued',
      createdAt: now,
      updatedAt: now,
      request,
      imageCount,
      estimateSeconds: estimateAnalyzeSeconds(imageCount),
      cacheKey,
      ...(cached ? { result: cached } : {}),
    };
    imageAnalyzeJobs.set(id, job);
    broadcastSse(id, {
      type: 'snapshot',
      job: {
        id: job.id,
        status: job.status,
        stage: job.stage,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        imageCount: job.imageCount,
        estimateSeconds: job.estimateSeconds,
      },
    });

    if (cached) {
      broadcastSse(id, { type: 'result', result: cached, at: Date.now() });
    } else {
      imageAnalyzeJobQueue.push(id);
      pumpImageAnalyzeQueue();
    }

    return res.json({ success: true, jobId: id });
  } catch (e: any) {
    console.error('❌ 创建图片分析作业失败:', e);
    return res.status(500).json({ success: false, errorMessage: '服务器内部错误' });
  }
});

app.post('/api/analyze-images/jobs/:jobId/cancel', (req, res) => {
  const jobId = String(req.params.jobId || '').trim();
  const job = imageAnalyzeJobs.get(jobId);
  if (!job) {
    return res.status(404).json({ success: false, errorMessage: '作业不存在或已过期' });
  }
  if (job.status === 'completed') {
    return res.status(400).json({ success: false, errorMessage: '作业已完成，无法取消' });
  }
  if (job.status === 'canceled') {
    return res.json({ success: true });
  }

  job.status = 'canceled';
  job.stage = 'canceled';
  job.errorMessage = '已取消';
  job.updatedAt = Date.now();

  for (let i = imageAnalyzeJobQueue.length - 1; i >= 0; i -= 1) {
    if (imageAnalyzeJobQueue[i] === jobId) imageAnalyzeJobQueue.splice(i, 1);
  }

  broadcastSse(jobId, {
    type: 'snapshot',
    job: {
      id: job.id,
      status: job.status,
      stage: job.stage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      errorMessage: job.errorMessage,
      imageCount: job.imageCount,
      estimateSeconds: job.estimateSeconds,
    },
  });
  return res.json({ success: true });
});

app.post('/api/analyze-images/jobs/:jobId/retry', (req, res) => {
  const jobId = String(req.params.jobId || '').trim();
  const job = imageAnalyzeJobs.get(jobId);
  if (!job) {
    return res.status(404).json({ success: false, errorMessage: '作业不存在或已过期' });
  }
  if (job.status === 'running' || job.status === 'pending') {
    return res.status(400).json({ success: false, errorMessage: '作业正在进行中，无法重试' });
  }

  const bypassCacheRaw = (req.query as any)?.bypassCache;
  const bypassCache =
    bypassCacheRaw === '1' || bypassCacheRaw === 1 || String(bypassCacheRaw || '').trim().toLowerCase() === 'true';

  job.status = 'pending';
  job.stage = 'queued';
  job.errorMessage = undefined;
  job.partialResult = undefined;
  job.result = undefined;
  job.events = [];
  if (bypassCache) {
    try {
      const key = job.cacheKey || computeImageAnalyzeCacheKey(job.request);
      imageAnalyzeResultCache.delete(key);
      job.cacheKey = key;
    } catch {}
    job.bypassCache = true;
  }
  job.updatedAt = Date.now();

  for (let i = imageAnalyzeJobQueue.length - 1; i >= 0; i -= 1) {
    if (imageAnalyzeJobQueue[i] === jobId) imageAnalyzeJobQueue.splice(i, 1);
  }

  broadcastSse(jobId, {
    type: 'snapshot',
    job: {
      id: job.id,
      status: job.status,
      stage: job.stage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      imageCount: job.imageCount,
      estimateSeconds: job.estimateSeconds,
    },
  });

  imageAnalyzeJobQueue.push(jobId);
  pumpImageAnalyzeQueue();

  return res.json({ success: true, bypassCache });
});

app.get('/api/analyze-images/jobs/:jobId', (req, res) => {
  const jobId = String(req.params.jobId || '').trim();
  const job = imageAnalyzeJobs.get(jobId);
  if (!job) {
    return res.status(404).json({ success: false, errorMessage: '作业不存在或已过期' });
  }

  const includeResult = String((req.query as any)?.includeResult || '').trim() === '1';
  return res.json({
    success: true,
    job: {
      id: job.id,
      status: job.status,
      stage: job.stage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      errorMessage: job.errorMessage,
      imageCount: job.imageCount,
      estimateSeconds: job.estimateSeconds,
    },
    ...(includeResult && job.partialResult ? { partialResult: job.partialResult } : {}),
    ...(includeResult && job.result ? { result: job.result } : {}),
  });
});

app.get('/api/analyze-images/jobs/:jobId/events', (req, res) => {
  const jobId = String(req.params.jobId || '').trim();
  const job = imageAnalyzeJobs.get(jobId);
  if (!job) {
    return res.status(404).json({ success: false, errorMessage: '作业不存在或已过期' });
  }

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  (res as any).flushHeaders?.();
  try {
    res.write('retry: 3000\n\n');
  } catch {}

  const set = imageAnalyzeJobStreams.get(jobId) || new Set<Response>();
  set.add(res);
  imageAnalyzeJobStreams.set(jobId, set);

  const lastIdRaw = String(req.headers['last-event-id'] || (req.query as any)?.lastEventId || '').trim();
  const lastId = Number(lastIdRaw);
  const lastEventId = Number.isFinite(lastId) && lastId > 0 ? Math.floor(lastId) : 0;

  const buffered = Array.isArray(job.events) ? job.events : [];
  const toSend = lastEventId > 0 ? buffered.filter((x) => x.id > lastEventId) : buffered;
  if (toSend.length > 0) {
    for (const ev of toSend) {
      try {
        writeSse(res, ev.data, ev.id);
      } catch {}
    }
  } else {
    writeSse(res, {
      type: 'snapshot',
      job: {
        id: job.id,
        status: job.status,
        stage: job.stage,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        errorMessage: job.errorMessage,
        imageCount: job.imageCount,
        estimateSeconds: job.estimateSeconds,
      },
    });
    if (job.partialResult) {
      writeSse(res, { type: 'partial_result', result: job.partialResult, at: Date.now() });
    }
    if (job.result) {
      writeSse(res, { type: 'result', result: job.result, at: Date.now() });
    }
  }

  const heartbeat = setInterval(() => {
    try {
      res.write(`: ping\n\n`);
    } catch {}
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    const s = imageAnalyzeJobStreams.get(jobId);
    if (s) {
      s.delete(res);
      if (s.size === 0) imageAnalyzeJobStreams.delete(jobId);
    }
  });
});

// 2.5 图片分析接口
app.post('/api/analyze-images', async (req, res) => {
  try {
    const { images, provider, subject, grade } = req.body;
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ success: false, errorMessage: '请上传至少一张图片' });
    }

    console.log(`\n📨 收到图片分析请求: ${images.length} 张图片, 学科: ${subject || '自动识别'}, 年级: ${grade || '未知'}`);
    
    // 构造 Vision Prompt
    const visionPrompt = `
${subject ? `【重要提示】已知该试卷学科为：${subject}，请务必基于此学科视角进行分析。` : ''}
${grade ? `【重要提示】学生年级为：${grade}，请参考此学段的认知水平进行评价。` : ''}

请分析这些试卷图片，提取以下关键信息并按 JSON 格式输出。

合规要求：
- 严禁直接给出完整解题步骤或作文终稿（避免形成抄答案路径）。
- 允许给“最小提示链”，但必须分三层：审题提示、思路提示、关键一步起始（不出现最终答案）。
- 所有结论必须有证据；如果证据不足，必须标为低置信度并给出补拍/老师确认建议。

1. 试卷名称：识别试卷顶部的标题（如“2023-2024学年三年级数学期末试卷”）。
2. 学科：识别试卷学科（如 数学/语文/英语）。
3. 总分与得分：识别学生总得分和试卷满分。
4. 题型得分详情：分析各个大题（如“一、计算题”“二、填空题”“三、阅读理解”“四、作文”等）的得分情况。
   - 需要提取：题型名称、该部分学生得分、该部分满分。
5. 卷面观感：评价书写工整度。
6. 分析报告：
   - 整体评价（forStudent.overall）
   - 存在问题（forStudent.problems 数组）
     - 每条必须同时包含以下字段标签：【知识点】【题号】【得分】【错因】【证据】【置信度】【最短改法】
     - 【题号】请标明对应题号或小题，如“3(2)”或“阅读-第2题”等，便于后续与原题定位。
     - 【得分】请使用“本题得分/本题满分”的格式，例如“1/4”“0/2”，用于量化该错因关联题目的得分情况。
   - 建议（forStudent.advice 数组，区分基础巩固、专项训练、习惯养成）

${grade ? getGradeLevelInstruction(grade) : ''}
${subject ? getSubjectAnalysisInstruction(subject) : ''}

在分析“错因”和知识点时，请结合不同学科的特点：
- 数学侧重区分：概念理解不到位、运算步骤不完整、审题不严、计算粗心、建模思路不清、逻辑表达不规范等。
- 语文侧重区分：字词基础薄弱、文本主旨把握不准、信息筛选不全、文言词句理解不到位、作文立意偏题或表达不具体等。
- 英语侧重区分：词汇量不足、时态语态混淆、句子结构错误、听力关键信息抓不住、阅读时只看单句不看上下文、写作中中式表达明显等。

7. 练习卷生成逻辑（practicePaper）：
${subject ? getSubjectPracticeInstruction(subject) : `
   请依据上述分析得出的【整体评价】、【存在问题】和【建议】进行综合考量，生成一份高质量的针对性练习卷：
   - 题目设计要直接针对识别出的“薄弱知识点”和“常见错因”。
   - 试卷结构（Sections）应尽量还原原试卷的题型框架（如：一、选择题；二、填空题；三、解答题）。
   - 确保题目具体、完整，不仅是描述题意，而是可直接让学生作答的真实题目（含具体数值、完整题干）。
   - 难度适中，旨在帮助学生纠错和巩固。
`}

请严格按照以下 JSON 格式输出（不要包含 Markdown 代码块标记）：
{
  "meta": {
    "examName": "试卷标题",
    "subject": "数学",
    "score": 85,
    "fullScore": 100,
    "typeAnalysis": [
      { "type": "计算题", "score": 28, "full": 30 },
      { "type": "填空题", "score": 18, "full": 20 }
    ],
    "paperAppearance": { "rating": "工整", "content": "书写认真..." }
  },
  "review": {
    "required": false,
    "reason": "",
    "suggestions": []
  },
  "forStudent": {
    "overall": "...",
    "problems": [
      "【知识点】一次函数图像【题号】3(2)【得分】0/2【错因】读图时忽略坐标含义【证据】第2小题坐标读取与图像不一致【置信度】中【最短改法】读图时先标出横纵轴含义并写出对应点坐标",
      "【知识点】完形填空-语境猜词【题号】完形-第5空【得分】0/1【错因】只看单句不结合上下文【证据】错误选项与后文转折词but矛盾【置信度】中【最短改法】先圈转折/因果词，再回看上下文验证"
    ],
    "advice": [
      "【基础巩固】回到教材例题和典型题，整理一次函数图像与代数式之间的对应关系。",
      "【专项训练】每周至少完成2套阅读或完形训练，做完后用不同颜色标记审题关键词。",
      "【习惯养成】做完题后用30秒回顾题干和答案，检查是否遗漏条件。"
    ]
  },
  "studyMethods": {
    "methods": ["更高效的做法（4-6条，短、可执行、与错因相关）"],
    "weekPlan": ["接下来7天微计划（5-7条，按天/阶段拆分，含复盘与验收）"]
  },
  "forParent": { ... },
  "practicePaper": {
    "title": "针对性巩固练习卷",
    "sections": [
      {
        "name": "一、基础巩固（选择题）",
        "questions": [
           { "no": 1, "content": "1. 题目文本...", "hints": ["审题提示...", "思路提示...", "关键一步起始..."] }
        ]
      }
    ]
  },
  "acceptanceQuiz": {
    "title": "验收小测",
    "passRule": "3题全对",
    "questions": [
      { "no": 1, "content": "题目文本...", "hints": ["审题提示...", "思路提示...", "关键一步起始..."] }
    ]
  }
}
`;

    const visionProvider = (provider as any) || process.env.DEFAULT_PROVIDER || 'doubao';

    let reportJson: any;
    try {
      const timeoutMs = Number(process.env.LLM_TIMEOUT_MS || 0);
      const rawContent = await withTimeout(
        llmService.generateImageAnalysis(images, visionPrompt, visionProvider as any, { temperature: 0.2 }),
        timeoutMs,
        '图片分析调用超时'
      );
      console.log('✅ Vision 模型返回长度:', rawContent.length);

      let parsed = parseLlmJson(rawContent);
      if (!parsed.ok) {
        const repairPrompt = `
你刚才的输出不是合法 JSON。请把下面内容转换为“严格合法 JSON”，只输出 JSON 本体，不要解释，不要 Markdown 代码块。

必须满足结构：
- meta.examName (string)
- meta.subject (string)
- meta.score (number)
- meta.fullScore (number)
- meta.typeAnalysis (array of {type, score, full})
- meta.paperAppearance (object)
- forStudent.overall (string)
- forStudent.problems (string[])
- forStudent.advice (string[])
- studyMethods.methods (string[])
- studyMethods.weekPlan (string[])
- forParent (object，可为空)
- practicePaper (object，可为空)
- review (object，可为空)
- acceptanceQuiz (object，可为空)

原始输出如下：
${rawContent}
`.trim();

        const repaired = await withTimeout(
          llmService.generateAnalysis(repairPrompt, visionProvider as any, { temperature: 0.1 }),
          timeoutMs,
          '图片分析结果修复超时'
        );
        parsed = parseLlmJson(repaired);
      }

      if (!parsed.ok) {
        throw parsed.error;
      }
      reportJson = parsed.value;

    } catch (err: any) {
      console.error('❌ Vision 分析失败:', err);
      return res.status(500).json({ success: false, errorMessage: '图片分析失败: ' + err.message });
    }

    const meta = reportJson.meta || {};
    const response: AnalyzeExamResponse = {
      success: true,
      data: {
        summary: {
          totalScore: meta.score || 0,
          rank: 0,
          beatPercentage: 0,
          strongestKnowledge: "基于图像分析",
          weakestKnowledge: "基于图像分析"
        },
        report: {
          forStudent: reportJson.forStudent || {},
          forParent: reportJson.forParent || {}
        },
        studyMethods: reportJson.studyMethods,
        examName: meta.examName,
        typeAnalysis: meta.typeAnalysis || [],
        paperAppearance: meta.paperAppearance,
        subject: meta.subject,
        review: reportJson.review,
        rawLlmOutput: JSON.stringify(reportJson),
        practiceQuestions: reportJson.practiceQuestions || [],
        practicePaper: reportJson.practicePaper,
        acceptanceQuiz: reportJson.acceptanceQuiz
      }
    };

    console.log('✅ 图片分析完成，返回结果');
    res.json(response);

  } catch (error) {
    console.error('❌ 处理图片请求失败:', error);
    res.status(500).json({ success: false, errorMessage: '服务器内部错误' });
  }
});

if (HAS_WEB_DIST) {
  app.use(express.static(WEB_DIST_DIR, { index: false }));
  app.get(/^(?!\/api(?:\/|$)).*/, (req, res) => {
    res.sendFile(WEB_INDEX_HTML);
  });
}

// 3. 启动服务
app.listen(PORT, () => {
  console.log(`\n🚀 后端服务已启动: http://localhost:${PORT}`);
  console.log(`👉 分析接口地址: http://localhost:${PORT}/api/analyze-exam`);
  console.log(`👉 练习生成接口: http://localhost:${PORT}/api/generate-practice`);
  if (HAS_WEB_DIST) {
    console.log(`👉 Web 已托管: http://localhost:${PORT}/`);
  }
});
