# P0 Quality Optimization - Integration Guide

## Overview

This guide explains how the P0 quality optimization components have been integrated into the exam analysis system to fix the three critical issues:
1. Output content readability (garbled text, LaTeX code)
2. Analysis report accuracy (content mismatch with exam paper)
3. Practice question relevance (questions not matching errors)

## Components Implemented

### 1. Content Sanitizer (`backend/core/sanitizer.ts`)

**Purpose**: Ensures all LLM output is readable, free of markdown/LaTeX code, and properly encoded.

**Key Functions**:
- `sanitizeContent(rawContent: string)`: Main sanitization function
- `sanitizeJsonString(jsonStr: string)`: Specialized for JSON strings
- `validateReadability(content: string)`: Validates cleaned content

**Integration Point**: `backend/server.ts` - `parseLlmJson()` function

```typescript
function parseLlmJson(rawContent: string) {
  // Step 1: Sanitize the content
  const sanitized = sanitizeJsonString(rawContent);
  
  // Step 2: Validate readability
  const readability = validateReadability(sanitized);
  if (!readability.isReadable) {
    console.warn('⚠️ [Content Sanitizer] 内容仍存在可读性问题:', readability.issues);
  }
  
  // Step 3: Extract and parse JSON
  const candidate = extractJsonCandidate(sanitized);
  // ... rest of parsing logic
}
```

**What It Does**:
1. Removes Markdown code block markers (```)
2. Converts LaTeX formulas to Unicode symbols or text
3. Removes control characters and BOM
4. Normalizes whitespace
5. Fixes encoding issues

**Example Transformations**:
- `$x^2$` → `x²`
- `\sqrt{2}` → `√2`
- `\frac{1}{2}` → `½` or `(1/2)`
- ` ```json` → (removed)
- Control characters → (removed)

### 2. Relevance Validator (`backend/core/relevance-validator.ts`)

**Purpose**: Validates that generated practice questions are relevant to the identified errors.

**Key Functions**:
- `validateRelevance(problemTexts: string[], practiceQuestions: PracticeQuestion[])`: Main validation
- `extractPracticeQuestions(practicePaper: any)`: Extracts questions from practice paper structure

**Integration Point**: `backend/server.ts` - After practice generation (TO BE INTEGRATED)

**Recommended Integration**:
```typescript
// After practice generation
const [diagnosis, practice] = await Promise.all([diagnosisTask, practiceTask]);

// Validate practice question relevance
const practiceQuestions = extractPracticeQuestions(practice.practicePaper);
const relevanceResult = validateRelevance(extractedProblems, practiceQuestions);

if (relevanceResult.needsRegeneration) {
  console.warn('⚠️ [Relevance Validator] 练习题相关性不足，需要重新生成');
  // Optionally: regenerate practice questions with stricter prompts
}

// Log relevance metrics
console.log(`✅ [Relevance Validator] 整体相关性: ${(relevanceResult.overall * 100).toFixed(0)}%`);
```

**Validation Criteria**:
- Knowledge point matching (70% weight)
- Error type matching (30% weight)
- Overall relevance threshold: 0.6
- Individual question threshold: 0.3
- Regeneration trigger: overall < 0.6 OR >30% questions irrelevant

### 3. Enhanced Prompts (`backend/llm/prompts.ts`)

**Changes Made**:
1. Added explicit output format requirements
2. Strengthened evidence requirements
3. Added readability constraints
4. Clarified score format requirements

**Key Additions**:
```typescript
【关键输出规范 - 必须严格遵守】：
1. 使用标准中文字符，严禁使用 LaTeX 代码或 Markdown 代码块标记
2. 所有数学公式必须用文字描述或 Unicode 符号表示
3. 基于图片内容进行分析，不得编造题号、得分或错因
4. 每个分析结论必须包含【题号】【得分】【证据】【置信度】【最短改法】五要素
5. 输出纯 JSON 格式，不要包含任何 Markdown 标记或代码块符号
6. 所有文本内容必须清晰可读，不得包含乱码、特殊符号或不可见字符
```

### 4. Evidence Validation (`backend/server.ts`)

**Integration Point**: `validateExtractJson()` function

**What It Does**:
- Checks that each problem has required fields: 【知识点】【题号】【得分】【证据】【置信度】
- Validates score format (X/Y)
- Logs warnings for missing or malformed evidence
- Does not block processing but records issues for monitoring

**Example Validation**:
```typescript
for (let i = 0; i < problems.length; i++) {
  const problem = problems[i];
  
  // Check required tags
  const hasKnowledge = problem.includes('【知识点】');
  const hasQuestionNo = problem.includes('【题号】');
  const hasScore = problem.includes('【得分】');
  const hasEvidence = problem.includes('【证据】');
  const hasConfidence = problem.includes('【置信度】');
  
  if (!hasKnowledge || !hasQuestionNo || !hasScore || !hasEvidence || !hasConfidence) {
    console.warn(`⚠️ [Evidence Validation] Problem ${i} 缺少必需字段`);
  }
  
  // Validate score format (X/Y)
  const scoreMatch = problem.match(/【得分】([^【]+)/);
  if (scoreMatch && !/\d+\/\d+/.test(scoreMatch[1].trim())) {
    console.warn(`⚠️ [Evidence Validation] Problem ${i} 得分格式不正确`);
  }
}
```

## Integration Status

### ✅ Completed

1. **Content Sanitizer**
   - ✅ Created `backend/core/sanitizer.ts`
   - ✅ Integrated into `parseLlmJson()` in `backend/server.ts`
   - ✅ All LLM outputs are now sanitized before parsing
   - ✅ Readability validation added

2. **Enhanced Prompts**
   - ✅ Updated `SYSTEM_PROMPT` with explicit format requirements
   - ✅ Updated `USER_PROMPT_TEMPLATE` with evidence requirements
   - ✅ Added output format examples (in progress)
   - ✅ Strengthened "no LaTeX, no Markdown" rules

3. **Evidence Validation**
   - ✅ Added validation in `validateExtractJson()`
   - ✅ Checks for required fields in each problem
   - ✅ Validates score format (X/Y)
   - ✅ Logs warnings for missing evidence

4. **Relevance Validator**
   - ✅ Created `backend/core/relevance-validator.ts`
   - ⏳ Integration into server.ts (PENDING)

### ⏳ Pending

1. **Relevance Validator Integration**
   - Location: `backend/server.ts` - After line 1290 (`const [diagnosis, practice] = await Promise.all(...)`)
   - Action: Add relevance validation after practice generation
   - Optional: Add regeneration logic if relevance is too low

2. **User Feedback Mechanism**
   - Add "Report Error" button in frontend
   - Collect user feedback on analysis accuracy
   - Log feedback for continuous improvement

3. **Quality Metrics Dashboard**
   - Track sanitization issues
   - Track evidence completeness
   - Track relevance scores
   - Generate weekly quality reports

## Testing

### Manual Testing Checklist

1. **Content Readability**
   - [ ] Upload exam with math formulas
   - [ ] Verify no LaTeX code in output (no `$x^2$`, `\sqrt{}`, etc.)
   - [ ] Verify no Markdown markers (no ` ``` `)
   - [ ] Verify all math symbols are Unicode (x², √, ≤, etc.)

2. **Evidence Completeness**
   - [ ] Upload exam and check analysis
   - [ ] Verify each problem has 【题号】【得分】【证据】【置信度】【最短改法】
   - [ ] Verify score format is "X/Y" (e.g., "0/2", "1/4")
   - [ ] Verify evidence is specific (not "从试卷可以看出")

3. **Practice Question Relevance**
   - [ ] Check practice questions match identified errors
   - [ ] Verify knowledge points align
   - [ ] Verify question types are similar
   - [ ] Check relevance score in logs

### Automated Testing

Run the smoke test:
```bash
cd backend
npm run test:smoke
```

Expected output:
- ✅ No LaTeX code in output
- ✅ No Markdown markers
- ✅ All problems have required fields
- ✅ Score format is correct
- ✅ Relevance score > 0.6

## Monitoring

### Key Metrics to Track

1. **Sanitization Issues**
   - Count of Markdown removals
   - Count of LaTeX conversions
   - Count of encoding fixes
   - Trend over time

2. **Evidence Quality**
   - % of problems with complete evidence
   - % of problems with correct score format
   - % of problems with high confidence
   - Trend over time

3. **Relevance Scores**
   - Average relevance score
   - % of analyses requiring regeneration
   - Distribution of relevance scores
   - Trend over time

### Log Messages to Monitor

```
✅ [Content Sanitizer] 内容已清洗，修改了 X 处
⚠️ [Content Sanitizer] 内容仍存在可读性问题: [...]
⚠️ [Evidence Validation] Problem X 缺少必需字段
⚠️ [Evidence Validation] Problem X 得分格式不正确
✅ [Relevance Validator] 整体相关性: X%
⚠️ [Relevance Validator] 练习题相关性不足，需要重新生成
```

## Rollback Plan

If issues arise:

1. **Disable Content Sanitizer**
   ```typescript
   // In backend/server.ts, parseLlmJson()
   // Comment out sanitization:
   // const sanitized = sanitizeJsonString(rawContent);
   // Use rawContent directly:
   const candidate = extractJsonCandidate(rawContent);
   ```

2. **Revert Prompt Changes**
   ```bash
   git checkout HEAD~1 backend/llm/prompts.ts
   ```

3. **Disable Evidence Validation**
   ```typescript
   // In backend/server.ts, validateExtractJson()
   // Comment out validation warnings
   ```

## Next Steps

1. **Complete Relevance Validator Integration** (P0)
   - Add validation after practice generation
   - Test with real exam data
   - Monitor relevance scores

2. **Add User Feedback** (P1)
   - Frontend: Add "Report Error" button
   - Backend: Add feedback endpoint
   - Database: Store feedback for analysis

3. **Quality Dashboard** (P1)
   - Aggregate quality metrics
   - Generate weekly reports
   - Identify improvement opportunities

4. **Continuous Improvement** (P2)
   - Analyze user feedback
   - Refine prompts based on common issues
   - Update sanitizer rules as needed

## Support

For questions or issues:
1. Check logs for warning messages
2. Review this integration guide
3. Consult the design document (`.kiro/specs/quality-optimization/design.md`)
4. Contact the development team

---

**Last Updated**: 2026-01-11
**Status**: P0 Implementation In Progress
**Next Review**: After relevance validator integration
