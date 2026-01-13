# P0 Quality Optimization - Testing Guide

## Overview

This guide provides comprehensive testing procedures for the P0 quality optimization features.

## Quick Test

### 1. Run Smoke Test

```bash
cd backend
npm run test:smoke
```

Expected output:
```
✅ Content Sanitizer: No LaTeX code found
✅ Content Sanitizer: No Markdown markers found
✅ Evidence Validation: All problems have required fields
✅ Evidence Validation: All scores in correct format
```

### 2. Manual Quick Test

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Upload a test exam with math formulas

3. Check the analysis output for:
   - ✅ No `$x^2$` or `\sqrt{}` (should be x², √)
   - ✅ No ` ``` ` markers
   - ✅ All problems have 【题号】【得分】【证据】【置信度】【最短改法】
   - ✅ Score format is "X/Y" (e.g., "0/2", "1/4")

## Detailed Testing

### Test 1: Content Sanitizer - LaTeX Removal

**Purpose**: Verify LaTeX formulas are converted to Unicode

**Test Data**: Upload exam with math problems

**Expected Behavior**:
- Input: `$x^2 + y^2 = r^2$`
- Output: `x² + y² = r²`

**Test Steps**:
1. Upload exam image with math formulas
2. Wait for analysis to complete
3. Check `forStudent.problems` array
4. Verify no `$` symbols in output
5. Verify math symbols are Unicode (x², √, ≤, etc.)

**Pass Criteria**:
- ✅ No LaTeX code (`$...$`) in output
- ✅ All math symbols are readable Unicode
- ✅ No `\sqrt`, `\frac`, `\leq` etc.

**Check Logs**:
```
✅ [Content Sanitizer] 内容已清洗，修改了 X 处
```

### Test 2: Content Sanitizer - Markdown Removal

**Purpose**: Verify Markdown markers are removed

**Expected Behavior**:
- Input: ` ```json\n{...}\n``` `
- Output: `{...}` (clean JSON)

**Test Steps**:
1. Check server logs during analysis
2. Look for sanitization messages
3. Verify final output has no ` ``` ` markers

**Pass Criteria**:
- ✅ No ` ``` ` in output
- ✅ No backticks (`) in text content
- ✅ JSON is clean and parseable

**Check Logs**:
```
✅ [Content Sanitizer] 移除了 Markdown 标记
```

### Test 3: Evidence Validation - Required Fields

**Purpose**: Verify all problems have required evidence fields

**Test Steps**:
1. Upload exam and wait for analysis
2. Check `forStudent.problems` array
3. Verify each problem has all required fields

**Required Fields**:
- 【知识点】
- 【题号】
- 【得分】
- 【错因】
- 【证据】
- 【置信度】
- 【最短改法】

**Pass Criteria**:
- ✅ All problems have all 7 required fields
- ✅ No empty fields
- ✅ Evidence is specific (not "从试卷可以看出")

**Check Logs**:
```
✅ [Evidence Validation] 所有问题都有完整证据
```

Or if issues:
```
⚠️ [Evidence Validation] Problem 0 缺少必需字段: hasEvidence=false
```

### Test 4: Evidence Validation - Score Format

**Purpose**: Verify score format is "X/Y"

**Test Steps**:
1. Upload exam and wait for analysis
2. Check each problem's 【得分】 field
3. Verify format matches "X/Y" pattern

**Valid Examples**:
- `0/2`
- `1/4`
- `3/5`
- `10/15`

**Invalid Examples**:
- `0` (missing denominator)
- `1分` (wrong format)
- `2 out of 4` (wrong format)

**Pass Criteria**:
- ✅ All scores match "X/Y" format
- ✅ X and Y are numbers
- ✅ X ≤ Y (score ≤ full score)

**Check Logs**:
```
✅ [Evidence Validation] 所有得分格式正确
```

Or if issues:
```
⚠️ [Evidence Validation] Problem 0 得分格式不正确: "0"
```

### Test 5: Relevance Validator (When Integrated)

**Purpose**: Verify practice questions match identified errors

**Test Steps**:
1. Upload exam with clear errors
2. Wait for analysis and practice generation
3. Check relevance validation logs
4. Verify practice questions target the errors

**Pass Criteria**:
- ✅ Relevance score ≥ 0.6
- ✅ < 30% of questions flagged as irrelevant
- ✅ Practice questions match error knowledge points

**Check Logs**:
```
✅ [Relevance Validator] 整体相关性: 85%
✅ [Relevance Validator] 5/5 题目相关
```

Or if issues:
```
⚠️ [Relevance Validator] 整体相关性: 45%
⚠️ [Relevance Validator] 2/5 题目不相关
⚠️ [Relevance Validator] 练习题相关性不足，需要重新生成
```

## Edge Case Testing

### Edge Case 1: Empty Evidence

**Test**: Upload exam where OCR fails to extract clear evidence

**Expected**:
- ⚠️ Warning logged
- 【置信度】marked as "低"
- Suggestion to re-upload or manual review

### Edge Case 2: Complex Math Formulas

**Test**: Upload exam with complex formulas (fractions, roots, exponents)

**Expected**:
- All formulas converted to Unicode or text
- No LaTeX code in output
- Formulas are readable

**Examples**:
- `\frac{a+b}{c}` → `(a+b)/c`
- `\sqrt{x^2 + y^2}` → `√(x² + y²)`
- `\sum_{i=1}^{n}` → `Σ(i=1 to n)`

### Edge Case 3: Special Characters

**Test**: Upload exam with special symbols (°, ∠, ∥, etc.)

**Expected**:
- Symbols preserved correctly
- No encoding issues
- No garbled text

### Edge Case 4: Multiple Errors Same Knowledge Point

**Test**: Upload exam with multiple errors in same knowledge area

**Expected**:
- All errors identified separately
- Practice questions cover all error types
- Relevance score remains high

## Performance Testing

### Test 1: Sanitization Overhead

**Purpose**: Measure performance impact of sanitization

**Test Steps**:
1. Run analysis with sanitization enabled
2. Measure total time
3. Disable sanitization (comment out in code)
4. Run same analysis
5. Compare times

**Expected**:
- Overhead < 100ms per analysis
- < 1% of total analysis time

### Test 2: Validation Overhead

**Purpose**: Measure performance impact of evidence validation

**Test Steps**:
1. Run analysis with validation enabled
2. Measure validation time in logs
3. Verify overhead is minimal

**Expected**:
- Overhead < 50ms per analysis
- Negligible impact on user experience

## Regression Testing

### Test 1: Backward Compatibility

**Purpose**: Ensure existing functionality still works

**Test Steps**:
1. Run all existing tests
2. Verify no regressions
3. Check that old analyses still work

**Pass Criteria**:
- ✅ All existing tests pass
- ✅ No new errors in logs
- ✅ Analysis quality improved or same

### Test 2: Different Subjects

**Purpose**: Verify fixes work across all subjects

**Test Subjects**:
- 数学 (Math)
- 语文 (Chinese)
- 英语 (English)
- 物理 (Physics)
- 化学 (Chemistry)

**Pass Criteria**:
- ✅ Sanitization works for all subjects
- ✅ Evidence validation works for all subjects
- ✅ No subject-specific issues

## Automated Testing

### Unit Tests (Recommended)

Create `backend/core/__tests__/sanitizer.test.ts`:

```typescript
import { sanitizeContent, validateReadability } from '../sanitizer';

describe('Content Sanitizer', () => {
  test('removes markdown code blocks', () => {
    const input = '```json\n{"key": "value"}\n```';
    const result = sanitizeContent(input);
    expect(result.cleaned).not.toContain('```');
  });

  test('converts LaTeX to Unicode', () => {
    const input = '$x^2 + y^2 = r^2$';
    const result = sanitizeContent(input);
    expect(result.cleaned).toContain('x²');
    expect(result.cleaned).not.toContain('$');
  });

  test('removes control characters', () => {
    const input = 'text\x00with\x1Fcontrol\x7Fchars';
    const result = sanitizeContent(input);
    expect(result.cleaned).toBe('textwithcontrolchars');
  });

  test('validates readability', () => {
    const clean = 'This is clean text with x² and √2';
    const result = validateReadability(clean);
    expect(result.isReadable).toBe(true);
    expect(result.issues).toHaveLength(0);
  });
});
```

Create `backend/core/__tests__/relevance-validator.test.ts`:

```typescript
import { validateRelevance } from '../relevance-validator';

describe('Relevance Validator', () => {
  test('validates relevant questions', () => {
    const problems = [
      '【知识点】一次函数【题号】3【得分】0/2【错因】计算错误【证据】...【置信度】高【最短改法】...'
    ];
    const questions = [
      { no: 1, content: '解一次函数方程：y = 2x + 3', hints: [] }
    ];
    
    const result = validateRelevance(problems, questions);
    expect(result.overall).toBeGreaterThan(0.6);
    expect(result.needsRegeneration).toBe(false);
  });

  test('flags irrelevant questions', () => {
    const problems = [
      '【知识点】一次函数【题号】3【得分】0/2【错因】计算错误【证据】...【置信度】高【最短改法】...'
    ];
    const questions = [
      { no: 1, content: '解二次方程：x² + 2x + 1 = 0', hints: [] }
    ];
    
    const result = validateRelevance(problems, questions);
    expect(result.overall).toBeLessThan(0.6);
    expect(result.needsRegeneration).toBe(true);
  });
});
```

Run tests:
```bash
cd backend
npm test
```

## Monitoring in Production

### Key Metrics

1. **Sanitization Rate**
   - Track: % of responses requiring sanitization
   - Alert if: > 50% (indicates LLM not following instructions)

2. **Evidence Completeness**
   - Track: % of problems with complete evidence
   - Alert if: < 90%

3. **Score Format Accuracy**
   - Track: % of problems with correct score format
   - Alert if: < 95%

4. **Relevance Score**
   - Track: Average relevance score
   - Alert if: < 0.7

### Log Monitoring

Set up alerts for:
```
⚠️ [Content Sanitizer] 内容仍存在可读性问题
⚠️ [Evidence Validation] Problem X 缺少必需字段
⚠️ [Relevance Validator] 练习题相关性不足
```

### Weekly Quality Report

Generate report with:
- Total analyses performed
- Sanitization statistics
- Evidence completeness rate
- Average relevance score
- Common issues and trends

## Troubleshooting

### Issue: LaTeX still appearing in output

**Diagnosis**:
1. Check if sanitizer is enabled
2. Check logs for sanitization messages
3. Verify LaTeX pattern matching

**Fix**:
- Update LaTeX patterns in `sanitizer.ts`
- Add new LaTeX commands to conversion map

### Issue: Evidence validation false positives

**Diagnosis**:
1. Check problem format in logs
2. Verify regex patterns
3. Check for encoding issues

**Fix**:
- Adjust validation regex
- Handle edge cases in validation logic

### Issue: Low relevance scores

**Diagnosis**:
1. Check practice question content
2. Check error knowledge points
3. Review relevance calculation logic

**Fix**:
- Improve practice generation prompts
- Adjust relevance thresholds
- Add more specific knowledge point matching

## Success Criteria

### P0 Acceptance Criteria

- ✅ 100% of output is readable (no LaTeX, no Markdown)
- ✅ 95%+ of problems have complete evidence
- ✅ 95%+ of scores in correct format
- ⏳ 85%+ of practice questions are relevant (pending integration)

### P1 Acceptance Criteria

- ⏳ Analysis time < 30 seconds (P50)
- ⏳ Analysis time < 60 seconds (P95)
- ⏳ User satisfaction ≥ 4.5/5.0

---

**Last Updated**: 2026-01-11
**Status**: P0 Testing Guide
**Next Review**: After relevance validator integration
