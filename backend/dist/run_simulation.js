"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sync_1 = require("csv-parse/sync");
const prompts_1 = require("./llm/prompts");
// =================================================================================
// 模拟脚本：跑通 "CSV读取 -> 数据组装 -> 大模型调用(模拟)" 闭环
// =================================================================================
// 1. 定义文件路径 (使用我们之前准备好的 CSV)
const STUDENT_CSV_PATH = path_1.default.resolve(__dirname, '../七年级数学期中考试-学生成绩.csv');
const QUESTION_CSV_PATH = path_1.default.resolve(__dirname, '../七年级数学期中考试-题目结构.csv');
// 2. 读取并解析 CSV 的辅助函数
function readCsv(filePath) {
    if (!fs_1.default.existsSync(filePath)) {
        console.error(`❌ 文件不存在: ${filePath}`);
        process.exit(1);
    }
    const fileContent = fs_1.default.readFileSync(filePath, 'utf-8');
    return (0, sync_1.parse)(fileContent, {
        columns: true, // 使用第一行作为列名
        skip_empty_lines: true,
        trim: true
    });
}
// 3. 主流程
async function main() {
    console.log('🚀 开始执行后端最小闭环测试...');
    // --- Step A: 读取数据 ---
    console.log(`\n📂 正在读取 CSV 文件...`);
    const studentRows = readCsv(STUDENT_CSV_PATH);
    const questionRows = readCsv(QUESTION_CSV_PATH);
    console.log(`   ✅ 读取到 ${studentRows.length} 名学生记录`);
    console.log(`   ✅ 读取到 ${questionRows.length} 道题目结构`);
    // --- Step B: 数据组装 (以第一名学生“小明”为例) ---
    const targetStudentName = '小明';
    const studentRow = studentRows.find((r) => r['学生姓名'] === targetStudentName);
    if (!studentRow) {
        console.error(`❌ 找不到学生: ${targetStudentName}`);
        return;
    }
    console.log(`\n👤 正在处理学生: ${targetStudentName}`);
    // B1. 组装学生信息
    const student = {
        name: studentRow['学生姓名'],
        id: studentRow['学号'],
        stage: studentRow['学段'],
        grade: studentRow['年级'],
        class: studentRow['班级']
    };
    // B2. 组装考试信息
    const exam = {
        subject: studentRow['学科'],
        title: studentRow['考试名称'],
        date: studentRow['考试时间'],
        fullScore: 100 // 暂时写死，或者算出所有题目分值之和
    };
    // B3. 组装题目结构
    const questions = questionRows.map((r) => ({
        no: r['题号'],
        score: Number(r['分值']),
        type: r['题型'],
        knowledgePoint: r['知识点'],
        abilityType: r['能力类型']
    }));
    // 计算试卷实际满分
    exam.fullScore = questions.reduce((sum, q) => sum + q.score, 0);
    // B4. 组装该学生的成绩记录
    const questionScores = {};
    questions.forEach(q => {
        // CSV 列名是 "T1得分", "T2得分"...
        const colName = `T${q.no}得分`;
        questionScores[q.no] = Number(studentRow[colName] || 0);
    });
    const scoreRecord = {
        totalScore: Number(studentRow['总分']),
        classRank: Number(studentRow['班级排名']),
        diffFromLast: Number(studentRow['与上次考试分差']),
        questionScores
    };
    // B5. 简单计算班级平均 (模拟)
    const classStats = {
        averageScore: 82.5, // 暂时假数据，或者遍历 studentRows 算一下
        studentCount: studentRows.length,
        questionAverages: {},
        knowledgePointRates: {}
    };
    // 简单算一下每道题的班级平均分
    questions.forEach(q => {
        const colName = `T${q.no}得分`;
        const sum = studentRows.reduce((acc, row) => acc + Number(row[colName] || 0), 0);
        classStats.questionAverages[q.no] = parseFloat((sum / studentRows.length).toFixed(1));
    });
    console.log(`   ✅ 数据组装完成: 总分 ${scoreRecord.totalScore} / ${exam.fullScore}`);
    // --- Step C: 生成 Prompt ---
    console.log(`\n🤖 正在生成 Prompt...`);
    // 构造题目详情字符串
    let questionDetailListStr = '';
    questions.forEach(q => {
        const studentScore = scoreRecord.questionScores[q.no];
        const classAvg = classStats.questionAverages[q.no];
        questionDetailListStr += `- 题${q.no} (${q.type}, ${q.knowledgePoint}): 满分${q.score}, 学生得分${studentScore}, 班级平均${classAvg}\n`;
    });
    // 简单的字符串替换 (实际可以用模板引擎)
    const prompt = prompts_1.USER_PROMPT_TEMPLATE
        .replace('{{studentName}}', student.name)
        .replace('{{grade}}', student.grade)
        .replace('{{subject}}', exam.subject)
        .replace('{{examTitle}}', exam.title)
        .replace('{{totalScore}}', String(scoreRecord.totalScore))
        .replace('{{fullScore}}', String(exam.fullScore))
        .replace('{{classAverage}}', String(classStats.averageScore))
        .replace('{{rank}}', String(scoreRecord.classRank))
        .replace('{{studentCount}}', String(classStats.studentCount))
        .replace('{{questionDetailList}}', questionDetailListStr)
        .replace('{{classWeakPoints}}', '(暂无特别薄弱点)');
    console.log('--------------------------------------------------');
    console.log('【发送给大模型的 Prompt】');
    console.log(prompt.trim());
    console.log('--------------------------------------------------');
    // --- Step D: 模拟调用大模型 (Mock) ---
    console.log(`\n📡 正在调用大模型 (模拟中)...`);
    // 这里暂时返回一个假结果，等你有了 Key 可以替换成真实调用
    const mockLlmResponse = JSON.stringify({
        studentView: {
            overallComment: "张三同学这次表现不错，特别是在基础计算上很扎实。",
            strengths: ["分式基本性质掌握得很好"],
            weaknesses: ["应用题审题还不够细心"],
            keyWrongQuestions: [
                { questionNo: 3, reason: "审题不清", advice: "圈出关键词再列式" }
            ],
            studyPlan: ["每天坚持做2道应用题"]
        },
        parentView: {
            summary: "孩子整体处于班级上游，基础牢固。",
            homeSupportAdvice: "建议家长多鼓励，不用额外报班。"
        }
    }, null, 2);
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log('✅ 大模型返回结果:');
    console.log(mockLlmResponse);
    console.log(`\n🎉 最小闭环测试成功！`);
}
main().catch(err => console.error(err));
