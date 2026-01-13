// =================================================================================
// 试卷信息提取器 (Exam Info Extractor)
// 从试卷图片中智能提取年级、学科等信息，优先使用识别结果
// =================================================================================

export interface ExtractedExamInfo {
  examName: string;
  subject: string;
  grade?: string;        // 从试卷中识别的年级
  detectedGrade?: string; // 检测到的年级（用于验证）
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
}

/**
 * 从考试名称中提取年级信息
 * 例如: "高一数学期中考试" → "高一"
 */
function extractGradeFromExamName(examName: string): string | null {
  const name = (examName || '').trim();
  
  // 高中
  if (name.match(/高[一二三]/)) {
    const match = name.match(/高[一二三]/);
    return match ? match[0] : null;
  }
  if (name.match(/高中/)) {
    return '高中';
  }
  
  // 初中
  if (name.match(/初[一二三]/)) {
    const match = name.match(/初[一二三]/);
    return match ? match[0] : null;
  }
  if (name.match(/初中/)) {
    return '初中';
  }
  
  // 小学
  if (name.match(/[一二三四五六]年级/)) {
    const match = name.match(/[一二三四五六]年级/);
    return match ? match[0] : null;
  }
  if (name.match(/小学/)) {
    return '小学';
  }
  
  return null;
}

/**
 * 从学科字段中提取学科信息
 * 例如: "高一数学" → "数学"
 */
function extractSubjectFromField(subject: string): string {
  const s = (subject || '').trim();
  
  // 移除年级前缀
  let cleaned = s
    .replace(/高[一二三]/, '')
    .replace(/高中/, '')
    .replace(/初[一二三]/, '')
    .replace(/初中/, '')
    .replace(/[一二三四五六]年级/, '')
    .replace(/小学/, '')
    .trim();
  
  // 如果清理后为空，返回原始值
  if (!cleaned) {
    cleaned = s;
  }
  
  return cleaned;
}

/**
 * 验证年级信息的一致性
 */
function validateGradeConsistency(
  userGrade: string | undefined,
  detectedGrade: string | null,
  examName: string
): {
  finalGrade: string;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
} {
  const warnings: string[] = [];
  let finalGrade = '';
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  
  // 规范化年级字符串
  const normalizeGrade = (grade: string): string => {
    return grade.trim().toLowerCase();
  };
  
  // 判断两个年级是否属于同一学段
  const isSameStage = (g1: string, g2: string): boolean => {
    const n1 = normalizeGrade(g1);
    const n2 = normalizeGrade(g2);
    
    // 高中学段
    const isHighSchool1 = /高[一二三]|高中|high|senior/.test(n1);
    const isHighSchool2 = /高[一二三]|高中|high|senior/.test(n2);
    if (isHighSchool1 && isHighSchool2) return true;
    
    // 初中学段
    const isMiddleSchool1 = /初[一二三]|初中|middle|junior/.test(n1);
    const isMiddleSchool2 = /初[一二三]|初中|middle|junior/.test(n2);
    if (isMiddleSchool1 && isMiddleSchool2) return true;
    
    // 小学学段
    const isPrimarySchool1 = /[一二三四五六]年级|小学|primary|grade\s*[1-6]/.test(n1);
    const isPrimarySchool2 = /[一二三四五六]年级|小学|primary|grade\s*[1-6]/.test(n2);
    if (isPrimarySchool1 && isPrimarySchool2) return true;
    
    return false;
  };
  
  // 情况1: 试卷识别到年级，用户也填写了年级
  if (detectedGrade && userGrade) {
    if (isSameStage(detectedGrade, userGrade)) {
      // 同一学段，优先使用试卷识别的年级（更准确）
      finalGrade = detectedGrade;
      confidence = 'high';
      
      if (normalizeGrade(detectedGrade) !== normalizeGrade(userGrade)) {
        warnings.push(`用户填写年级"${userGrade}"与试卷识别年级"${detectedGrade}"不完全一致，已使用试卷识别结果`);
      }
    } else {
      // 不同学段，严重冲突
      finalGrade = detectedGrade; // 仍然优先使用试卷识别
      confidence = 'medium';
      warnings.push(`⚠️ 严重冲突：用户填写年级"${userGrade}"与试卷识别年级"${detectedGrade}"不匹配，已使用试卷识别结果`);
    }
  }
  // 情况2: 只有试卷识别到年级
  else if (detectedGrade) {
    finalGrade = detectedGrade;
    confidence = 'high';
    warnings.push(`已从试卷中自动识别年级：${detectedGrade}`);
  }
  // 情况3: 只有用户填写年级
  else if (userGrade) {
    finalGrade = userGrade;
    confidence = 'low';
    warnings.push(`使用用户填写的年级：${userGrade}（未从试卷中识别到年级信息）`);
  }
  // 情况4: 都没有
  else {
    finalGrade = '未知';
    confidence = 'low';
    warnings.push('⚠️ 无法确定年级信息，请在基本信息设置中填写');
  }
  
  return { finalGrade, confidence, warnings };
}

/**
 * 从试卷识别结果中提取并验证信息
 */
export function extractAndValidateExamInfo(
  extractedMeta: any,
  userProvidedInfo: {
    grade?: string;
    subject?: string;
    examName?: string;
  }
): ExtractedExamInfo {
  const warnings: string[] = [];
  
  // 1. 提取试卷识别的信息
  const detectedExamName = (extractedMeta?.examName || '').trim();
  const detectedSubject = (extractedMeta?.subject || '').trim();
  const detectedGrade = extractGradeFromExamName(detectedExamName);
  
  // 2. 验证年级一致性
  const gradeValidation = validateGradeConsistency(
    userProvidedInfo.grade,
    detectedGrade,
    detectedExamName
  );
  
  warnings.push(...gradeValidation.warnings);
  
  // 3. 确定最终的学科
  let finalSubject = detectedSubject;
  if (userProvidedInfo.subject && userProvidedInfo.subject.trim()) {
    const userSubject = extractSubjectFromField(userProvidedInfo.subject);
    const detectedSubjectClean = extractSubjectFromField(detectedSubject);
    
    if (userSubject !== detectedSubjectClean) {
      warnings.push(`用户填写学科"${userSubject}"与试卷识别学科"${detectedSubjectClean}"不一致，已使用试卷识别结果`);
    }
  }
  
  // 4. 确定最终的考试名称
  let finalExamName = detectedExamName;
  if (userProvidedInfo.examName && userProvidedInfo.examName.trim()) {
    if (userProvidedInfo.examName !== detectedExamName) {
      warnings.push(`用户填写考试名称"${userProvidedInfo.examName}"与试卷识别"${detectedExamName}"不一致，已使用试卷识别结果`);
    }
  }
  
  return {
    examName: finalExamName,
    subject: finalSubject,
    grade: gradeValidation.finalGrade,
    detectedGrade: detectedGrade || undefined,
    confidence: gradeValidation.confidence,
    warnings,
  };
}

/**
 * 生成信息验证报告（用于日志）
 */
export function generateValidationReport(info: ExtractedExamInfo): string {
  const lines: string[] = [];
  
  lines.push('='.repeat(80));
  lines.push('📋 试卷信息验证报告');
  lines.push('='.repeat(80));
  lines.push(`考试名称: ${info.examName}`);
  lines.push(`学科: ${info.subject}`);
  lines.push(`年级: ${info.grade} (置信度: ${info.confidence})`);
  
  if (info.detectedGrade) {
    lines.push(`试卷识别年级: ${info.detectedGrade}`);
  }
  
  if (info.warnings.length > 0) {
    lines.push('');
    lines.push('⚠️  验证警告:');
    info.warnings.forEach((warning, index) => {
      lines.push(`  ${index + 1}. ${warning}`);
    });
  } else {
    lines.push('');
    lines.push('✅ 所有信息验证通过，无冲突');
  }
  
  lines.push('='.repeat(80));
  
  return lines.join('\n');
}
