declare const require: any;
declare const process: any;
declare const Buffer: any;

const fs = require('fs');
const path = require('path');
const http = require('http');

const SERVER_URL = 'http://localhost:3002';
const API_ENDPOINT = '/api/analyze-images';

// Image paths provided by user
const IMAGE_PATHS = [
  String.raw`D:\试卷分析助手 - 副本\微信图片_20260105165144_394_53.jpg`,
  String.raw`D:\试卷分析助手 - 副本\微信图片_20260105165145_395_53.jpg`,
  String.raw`D:\试卷分析助手 - 副本\微信图片_20260105165147_396_53.jpg`
];

async function fileToBase64(filePath: string): Promise<string> {
  const data = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  let mime = 'image/jpeg';
  if (ext === '.png') mime = 'image/png';
  return `data:${mime};base64,${data.toString('base64')}`;
}

function postJson(endpoint: string, data: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost',
      port: 3002,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res: any) => {
      let resData = '';
      res.on('data', (chunk: any) => resData += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(resData));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${resData}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function checkHealth(): Promise<void> {
  return new Promise((resolve, reject) => {
    http.get(SERVER_URL, (res: any) => {
      if (res.statusCode === 200) resolve();
      else reject(new Error(`Status ${res.statusCode}`));
    }).on('error', reject);
  });
}

async function runSmokeTest() {
  console.log('🚀 Starting Smoke Test: End-to-End Image Analysis');
  
  try {
    await checkHealth();
    console.log('✅ Server is up and running.');
  } catch (e) {
    console.error('❌ Failed to connect to server. Is it running on port 3002?', e);
    process.exit(1);
  }

  console.log('📸 Reading and encoding images...');
  const base64Images: string[] = [];
  for (const p of IMAGE_PATHS) {
    if (fs.existsSync(p)) {
      base64Images.push(await fileToBase64(p));
      console.log(`  - Loaded: ${path.basename(p)}`);
    } else {
      console.warn(`  ⚠️ File not found: ${p}`);
    }
  }

  if (base64Images.length === 0) {
    console.error('❌ No images loaded. Aborting.');
    process.exit(1);
  }

  const payload = {
    images: base64Images,
    provider: 'doubao',
    subject: '数学',
    grade: '七年级'
  };

  console.log('📡 Sending request to /api/analyze-images... (This may take 30-60s)');
  const startTime = Date.now();
  
  try {
    const result = await postJson(API_ENDPOINT, payload);
    const duration = (Date.now() - startTime) / 1000;
    console.log(`✅ Analysis complete in ${duration.toFixed(2)}s`);

    if (!result.success || !result.data) {
      console.error('❌ Response success flag is false or data missing');
      console.log(JSON.stringify(result, null, 2));
      process.exit(1);
    }

    const data = result.data;
    const report = data.report;
    const forStudent = report.forStudent;
    
    console.log('\n🔍 Validating Acceptance Criteria (V0.1)...');
    
    console.log('\n--- AC-1.1 & 1.3: Evidence & Confidence ---');
    if (forStudent.problems && forStudent.problems.length > 0) {
      forStudent.problems.forEach((p: any, idx: number) => {
        const raw = p?.desc ?? p ?? '';
        const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
        console.log(`Problem ${idx + 1}:`);
        console.log(`  Text: ${text.substring(0, 100)}...`);
        const isObj = typeof raw === 'object' && raw !== null;
        const hasEvidence = text.includes('【证据】') || (isObj && ('证据' in raw || 'evidence' in raw));
        const hasConfidence = text.includes('【置信度】') || (isObj && ('置信度' in raw || 'confidence' in raw));
        const hasFix = text.includes('【最短改法】') || (isObj && ('最短改法' in raw || 'fix' in raw));
        
        console.log(`  Evidence: ${hasEvidence ? '✅' : '❌'}`);
        console.log(`  Confidence: ${hasConfidence ? '✅' : '❌'}`);
        console.log(`  Quick Fix: ${hasFix ? '✅' : '❌'}`);
      });
    }

    console.log('\n--- AC-SOP: Practice Paper ---');
    if (data.practicePaper) {
        console.log('✅ Generated Title:', data.practicePaper.title);
        if (Array.isArray(data.practicePaper.sections)) {
          data.practicePaper.sections.forEach((sec: any) => {
              const count = Array.isArray(sec?.questions) ? sec.questions.length : 0;
              console.log(`  Section: ${sec?.name || '未命名'} (${count} questions)`);
          });
        } else {
          console.log('⚠️ practicePaper.sections missing or not array');
        }
    }

    console.log('\n--- AC-2.1: Acceptance Quiz ---');
    if (data.acceptanceQuiz) {
        console.log('✅ Generated. Pass Rule:', data.acceptanceQuiz.passRule);
    }

    console.log('\n--- AC-StudyMethods: Study Methods Closed Loop ---');
    if (data.studyMethods && Array.isArray(data.studyMethods.methods) && data.studyMethods.methods.length > 0) {
      console.log(`✅ studyMethods.methods: ${data.studyMethods.methods.length} items`);
      if (Array.isArray(data.studyMethods.weekPlan)) {
        console.log(`✅ studyMethods.weekPlan: ${data.studyMethods.weekPlan.length} items`);
      } else {
        console.log('⚠️ studyMethods.weekPlan missing or not array');
      }
    } else {
      console.log('⚠️ studyMethods missing or empty (fallback should still work in frontend)');
    }

    console.log('\n🎉 Smoke Test Completed Successfully.');

  } catch (err) {
    console.error('❌ Test Failed:', err);
    process.exit(1);
  }
}

runSmokeTest();
