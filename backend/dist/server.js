"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const prompts_1 = require("./llm/prompts");
const service_1 = require("./llm/service"); // 引入真实的 LLM 服务
// =================================================================================
// 真正的 Web 后端服务
// =================================================================================
const app = (0, express_1.default)();
const PORT = 3001;
// 1. 中间件配置
app.use((0, cors_1.default)()); // 允许跨域
app.use(body_parser_1.default.json({ limit: '50mb' })); // 支持大 JSON (图片 Base64)
// 1.5 根路径健康检查
app.get('/', (req, res) => {
    res.send(`
    <h1>试卷分析助手后端服务</h1>
    <p>状态: 🟢 运行中</p>
    <p>API 接口: <code>POST /api/analyze-exam</code></p>
    <p>当前时间: ${new Date().toLocaleString()}</p>
  `);
});
// 2. 核心分析接口
app.post('/api/analyze-exam', async (req, res) => {
    try {
        const data = req.body;
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
        const prompt = prompts_1.USER_PROMPT_TEMPLATE
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
            .replace('{{classWeakPoints}}', '(暂无特别薄弱点)');
        console.log('📝 生成 Prompt 长度:', prompt.length);
        // --- Step B: 调用真实大模型 ---
        console.log(`📡 正在调用 ${data.modelProvider} (真实API)...`);
        let reportJson;
        try {
            // 1. 发起调用
            const rawContent = await service_1.llmService.generateAnalysis(prompt, data.modelProvider);
            console.log('✅ 大模型返回原始内容长度:', rawContent.length);
            // 2. 尝试解析 JSON
            // 有时候大模型会返回 ```json ... ```，需要清理一下
            const jsonStr = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
            reportJson = JSON.parse(jsonStr);
        }
        catch (llmError) {
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
        const response = {
            success: true,
            data: {
                summary: {
                    totalScore: data.score.totalScore,
                    rank: data.score.classRank || 0,
                    beatPercentage: 85, // 这个逻辑以后可以在本地算
                    strongestKnowledge: "自动分析中", // 暂时占位
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
                rawLlmOutput: JSON.stringify(reportJson)
            }
        };
        console.log('✅ 分析完成，返回结果');
        res.json(response);
    }
    catch (error) {
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
        const { images, config } = req.body;
        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ success: false, errorMessage: '请上传至少一张图片' });
        }
        console.log(`\n📨 收到图片分析请求: ${images.length} 张图片`);
        // 构造 Vision Prompt
        const visionPrompt = `
请分析这些试卷图片，提取以下关键信息并按 JSON 格式输出：

1. **试卷名称**：识别试卷顶部的标题（如“2023-2024学年三年级数学期末试卷”）。
2. **学科**：识别试卷学科。
3. **总分与得分**：识别学生总得分和试卷满分。
4. **题型得分详情**：分析各个大题（如“一、计算题”、“二、填空题”等）的得分情况。
   - 需要提取：题型名称、该部分学生得分、该部分满分。
5. **卷面观感**：评价书写工整度。
6. **分析报告**：
   - 整体评价（forStudent.overall）
   - 存在问题（forStudent.problems 数组）
   - 建议（forStudent.advice 数组）

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
    "problems": ["..."],
    "advice": ["..."]
  },
  "forParent": { ... }
}
`;
        // 调用 LLM Vision
        let reportJson;
        try {
            const rawContent = await service_1.llmService.generateImageAnalysis(images, visionPrompt, config);
            console.log('✅ Vision 模型返回长度:', rawContent.length);
            const jsonStr = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
            reportJson = JSON.parse(jsonStr);
        }
        catch (err) {
            console.error('❌ Vision 分析失败:', err);
            return res.status(500).json({ success: false, errorMessage: '图片分析失败: ' + err.message });
        }
        // 构造响应
        const meta = reportJson.meta || {};
        const response = {
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
                // 传递新字段给前端
                examName: meta.examName,
                typeAnalysis: meta.typeAnalysis || [],
                paperAppearance: meta.paperAppearance,
                rawLlmOutput: JSON.stringify(reportJson)
            }
        };
        console.log('✅ 图片分析完成，返回结果');
        res.json(response);
    }
    catch (error) {
        console.error('❌ 处理图片请求失败:', error);
        res.status(500).json({ success: false, errorMessage: '服务器内部错误' });
    }
});
// 3. 启动服务
app.listen(PORT, () => {
    console.log(`\n🚀 后端服务已启动: http://localhost:${PORT}`);
    console.log(`👉 分析接口地址: http://localhost:${PORT}/api/analyze-exam`);
});
