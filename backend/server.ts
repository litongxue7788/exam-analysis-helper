import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { AnalyzeExamRequest, AnalyzeExamResponse } from './api/interface';
import { USER_PROMPT_TEMPLATE, getGradeLevelInstruction, getSubjectPracticeInstruction, getSubjectAnalysisInstruction } from './llm/prompts';
import { llmService } from './llm/service';

// =================================================================================
// 真正的 Web 后端服务
// =================================================================================

const app = express();
const PORT = 3002;
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

function parseLlmJson(rawContent: string): { ok: true; value: any; usedText: string } | { ok: false; error: Error; usedText: string } {
  const candidate = extractJsonCandidate(rawContent);
  try {
    return { ok: true, value: JSON.parse(candidate), usedText: candidate };
  } catch (e: any) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { ok: false, error: err, usedText: candidate };
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
let currentDay = new Date().toISOString().slice(0, 10);

app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) return next();

  const today = new Date().toISOString().slice(0, 10);
  if (today !== currentDay) {
    currentDay = today;
    rateBuckets.clear();
    dailyCounts.clear();
  }

  const requiredRaw = String(process.env.TRIAL_ACCESS_CODES || process.env.TRIAL_ACCESS_CODE || '').trim();
  const requiredCodes = requiredRaw
    ? requiredRaw.split(',').map(s => s.trim()).filter(Boolean)
    : [];
  const gotCode = String(req.headers['x-access-code'] || '').trim();

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

  if (requiredCodes.length > 0) {
    const codeRateKey = `code:${gotCode}`;
    const codeDailyKey = `day:${today}:code:${gotCode}`;
    if (!rateCheck(codeRateKey, perCodePerMinute)) {
      return res.status(429).json({ success: false, errorMessage: '请求过于频繁，请稍后再试' });
    }
    if (!dailyCheck(codeDailyKey, perCodePerDay)) {
      return res.status(429).json({ success: false, errorMessage: '今日使用额度已用完' });
    }
  }

  if (ip) {
    const ipRateKey = `ip:${ip}`;
    const ipDailyKey = `day:${today}:ip:${ip}`;
    if (!rateCheck(ipRateKey, perIpPerMinute)) {
      return res.status(429).json({ success: false, errorMessage: '请求过于频繁，请稍后再试' });
    }
    if (!dailyCheck(ipDailyKey, perIpPerDay)) {
      return res.status(429).json({ success: false, errorMessage: '今日使用额度已用完' });
    }
  }

  next();
});

// 1.5 根路径健康检查
app.get('/', (req, res) => {
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
        llmService.generateAnalysis(prompt, data.modelProvider),
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
      llmService.generateAnalysis(prompt, modelProvider as any),
      timeoutMs,
      '精准训练生成超时'
    );
    
    console.log('✅ 训练题生成长度:', rawContent.length);

    let parsed = parseLlmJson(rawContent);
    if (!parsed.ok) {
       console.warn('⚠️ JSON 解析失败，尝试修复...');
       const repairPrompt = `请修复以下 JSON，只输出 JSON 本体：\n${rawContent}`;
       const repaired = await withTimeout(
         llmService.generateAnalysis(repairPrompt, modelProvider as any),
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
        llmService.generateImageAnalysis(images, visionPrompt, visionProvider as any),
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
          llmService.generateAnalysis(repairPrompt, visionProvider as any),
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

// 3. 启动服务
app.listen(PORT, () => {
  console.log(`\n🚀 后端服务已启动: http://localhost:${PORT}`);
  console.log(`👉 分析接口地址: http://localhost:${PORT}/api/analyze-exam`);
  console.log(`👉 练习生成接口: http://localhost:${PORT}/api/generate-practice`);
});
