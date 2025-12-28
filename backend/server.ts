import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { AnalyzeExamRequest, AnalyzeExamResponse } from './api/interface';
import { USER_PROMPT_TEMPLATE, getGradeLevelInstruction, getSubjectPracticeInstruction } from './llm/prompts';
import { llmService } from './llm/service';

// =================================================================================
// 真正的 Web 后端服务
// =================================================================================

const app = express();
const PORT = 3002;
const LLM_CONFIG_PATH = path.resolve(__dirname, '../config/llm.json');

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
    <p>状态: 🟢 运行中</p>
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
    
    console.log(`\n📨 收到分析请求: ${data.student.name} - ${data.exam.subject}`);

    // --- Step A: 构造 Prompt (复用之前的逻辑) ---
    // 构造题目详情字符串
    let questionDetailListStr = '';
    data.questions.forEach(q => {
      const studentScore = data.score.questionScores[q.no] || 0;
      const classAvg = data.classStats.questionAverages[q.no] || 0;
      questionDetailListStr += `- 题${q.no} (${q.type}, ${q.knowledgePoint}): 满分${q.score}, 学生得分${studentScore}, 班级平均${classAvg}\n`;
    });

    // 填充 Prompt 模板
    const prompt = USER_PROMPT_TEMPLATE
      .replace('{{studentName}}', data.student.name)
      .replace('{{grade}}', data.student.grade)
      .replace('{{subject}}', data.exam.subject)
      .replace('{{examTitle}}', data.exam.title)
      .replace('{{totalScore}}', String(data.score.totalScore))
      .replace('{{fullScore}}', String(data.exam.fullScore))
      .replace('{{classAverage}}', String(data.classStats.averageScore))
      .replace('{{rank}}', String(data.score.classRank || '未统计'))
      .replace('{{studentCount}}', String(data.classStats.studentCount))
      .replace('{{questionDetailList}}', questionDetailListStr)
      .replace('{{gradeLevelInstruction}}', getGradeLevelInstruction(data.student.grade))
      .replace('{{subjectPracticeInstruction}}', getSubjectPracticeInstruction(data.exam.subject));

    console.log('📝 生成 Prompt 长度:', prompt.length);

    // --- Step B: 调用真实大模型 ---
    console.log(`📡 正在调用 ${data.modelProvider} (真实API)...`);
    
    let reportJson: any;
    try {
      // 1. 发起调用
      const rawContent = await llmService.generateAnalysis(prompt, data.modelProvider);
      console.log('✅ 大模型返回原始内容长度:', rawContent.length);

      // 2. 尝试解析 JSON
      // 有时候大模型会返回 ```json ... ```，需要清理一下
      const jsonStr = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
      reportJson = JSON.parse(jsonStr);

    } catch (llmError: any) {
      console.error('❌ 大模型调用或解析失败:', llmError);
      // 降级处理：如果失败，返回一个兜底的错误报告
      reportJson = {
        studentView: {
          overallComment: "系统暂时无法连接智能分析服务，请检查 API 配置。",
          problems: ["调用失败"],
          advice: ["请联系管理员"]
        },
        forParent: {
          summary: "分析服务暂时不可用。",
          guidance: "请稍后重试。"
        }
      };
    }

    // --- Step C: 构造响应 ---
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
            overall: reportJson.studentView?.overallComment || '解析异常',
            problems: reportJson.studentView?.problems || [],
            advice: reportJson.studentView?.studyPlan || reportJson.studentView?.advice || []
          },
          forParent: {
            summary: reportJson.parentView?.summary || '解析异常',
            guidance: reportJson.parentView?.homeSupportAdvice || reportJson.parentView?.guidance || ''
          }
        },
        rawLlmOutput: JSON.stringify(reportJson),
        practiceQuestions: reportJson.practiceQuestions || reportJson.studentView?.practiceQuestions || [],
        practicePaper: reportJson.practicePaper
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

请分析这些试卷图片，提取以下关键信息并按 JSON 格式输出：

1. 试卷名称：识别试卷顶部的标题（如“2023-2024学年三年级数学期末试卷”）。
2. 学科：识别试卷学科（如 数学/语文/英语）。
3. 总分与得分：识别学生总得分和试卷满分。
4. 题型得分详情：分析各个大题（如“一、计算题”“二、填空题”“三、阅读理解”“四、作文”等）的得分情况。
   - 需要提取：题型名称、该部分学生得分、该部分满分。
5. 卷面观感：评价书写工整度。
6. 分析报告：
   - 整体评价（forStudent.overall）
   - 存在问题（forStudent.problems 数组，要求每条同时包含【知识点】和【错因】）
   - 建议（forStudent.advice 数组，区分基础巩固、专项训练、习惯养成）

${grade ? getGradeLevelInstruction(grade) : ''}

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
  "forStudent": {
    "overall": "...",
    "problems": [
      "【知识点】一次函数图像【错因】读图时忽略坐标含义，概念理解不到位",
      "【知识点】完形填空-语境猜词【错因】只看单句，不结合上下文推断"
    ],
    "advice": [
      "【基础巩固】回到教材例题和典型题，整理一次函数图像与代数式之间的对应关系。",
      "【专项训练】每周至少完成2套阅读或完形训练，做完后用不同颜色标记审题关键词。",
      "【习惯养成】做完题后用30秒回顾题干和答案，检查是否遗漏条件。"
    ]
  },
  "forParent": { ... },
  "practicePaper": {
    "title": "针对性巩固练习卷",
    "sections": [
      {
        "name": "一、基础巩固（选择题）",
        "questions": [
           { "no": 1, "content": "1. 题目文本...", "answer": "答案..." }
        ]
      }
    ]
  }
}
`;

    const visionProvider = (provider as any) || process.env.DEFAULT_PROVIDER || 'doubao';

    let reportJson: any;
    try {
      const rawContent = await llmService.generateImageAnalysis(images, visionPrompt, visionProvider as any);
      console.log('✅ Vision 模型返回长度:', rawContent.length);

      const jsonStr = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
      reportJson = JSON.parse(jsonStr);

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
        examName: meta.examName,
        typeAnalysis: meta.typeAnalysis || [],
        paperAppearance: meta.paperAppearance,
        subject: meta.subject,
        rawLlmOutput: JSON.stringify(reportJson),
        practiceQuestions: reportJson.practiceQuestions || [],
        practicePaper: reportJson.practicePaper
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
});
