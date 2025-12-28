// =================================================================================
// 学科配置中心
// 用于定义不同学科的题型-能力映射、报告展示规则等
// =================================================================================

export interface AbilityMapping {
  keywords: string[]; // 匹配题型的关键词（不区分大小写）
  ability: string;    // 能力维度名称
  desc: string;       // 能力维度描述
}

export interface SubjectConfig {
  name: string;
  mappings: AbilityMapping[];
  defaultMapping: {
    ability: string;
    desc: string;
  };
}

// ---------------------------------------------------------------------------------
// 1. 数学配置 (Mathematics)
// ---------------------------------------------------------------------------------
const mathConfig: SubjectConfig = {
  name: '数学',
  mappings: [
    {
      keywords: ['计算'],
      ability: '计算能力',
      desc: '侧重对四则运算、分式运算等基础计算的准确性与熟练度，考察运算步骤是否规范、是否有粗心失误。'
    },
    {
      keywords: ['选择'],
      ability: '基础识记与快速判断',
      desc: '强调对概念、公式、定理的理解与辨析，要求在有限时间内快速判断正误，体现基础掌握和阅读理解能力。'
    },
    {
      keywords: ['填空'],
      ability: '基础运算与灵活迁移',
      desc: '在没有选项提示的情况下独立算出结果，考察学生把基础知识灵活迁移到题目中的能力。'
    },
    {
      keywords: ['应用', '解决问题'],
      ability: '综合应用与建模能力',
      desc: '从实际情境中提取数学信息，建立算式或方程解决问题，考察阅读理解、建模思维和结果检验意识。'
    },
    {
      keywords: ['几何'],
      ability: '空间想象与逻辑推理',
      desc: '通过图形关系、角度与边长的推导，考察学生的空间想象能力和多步推理的条理性。'
    },
    {
      keywords: ['证明'],
      ability: '逻辑表达与证明能力',
      desc: '要求有清晰的推理链条和规范的文字表达，考察严谨思维和数学语言的组织能力。'
    }
  ],
  defaultMapping: {
    ability: '综合能力',
    desc: '综合考察本章节多个知识点的理解、运用和解题思路的完整性。'
  }
};

// ---------------------------------------------------------------------------------
// 2. 语文配置 (Chinese)
// ---------------------------------------------------------------------------------
const chineseConfig: SubjectConfig = {
  name: '语文',
  mappings: [
    {
      keywords: ['阅读', '阅读理解'],
      ability: '阅读理解与信息提取',
      desc: '通过阅读文章把握主旨、关键信息和作者观点，考察筛选信息、概括归纳和推理判断能力。'
    },
    {
      keywords: ['基础', '字词', '积累', '默写'],
      ability: '语文基础与积累',
      desc: '关注字词句、成语、病句等基础知识的掌握情况，考察日常积累和规范语文表达的能力。'
    },
    {
      keywords: ['文言'],
      ability: '文言文理解与翻译',
      desc: '通过对关键词句的理解把握文意，考察文言词语积累、句式特点和整体翻译能力。'
    },
    {
      keywords: ['古诗', '诗词'],
      ability: '古诗文理解与积累',
      desc: '考察对古诗词内容、情感和表达手法的把握，以及名句名篇的记忆与运用。'
    },
    {
      keywords: ['作文', '写作'],
      ability: '表达与写作能力',
      desc: '重点考察审题立意、结构谋篇、语言表达和细节描写等综合写作能力。'
    },
    {
      keywords: ['口语', '交际'],
      ability: '口语表达与沟通能力',
      desc: '考察在真实情境中的表达清晰度、倾听与回应能力以及礼貌得体的沟通方式。'
    }
  ],
  defaultMapping: {
    ability: '综合语文素养',
    desc: '综合考察对语言文字的理解、感悟和运用能力。'
  }
};

// ---------------------------------------------------------------------------------
// 3. 英语配置 (English)
// ---------------------------------------------------------------------------------
const englishConfig: SubjectConfig = {
  name: '英语',
  mappings: [
    {
      keywords: ['听力'],
      ability: '听力理解能力',
      desc: '通过语音信息获取关键信息和细节，考察在连续语音中理解指令、场景和人物意图的能力。'
    },
    {
      keywords: ['完形', '克漏', 'cloze'],
      ability: '语法与语境综合运用',
      desc: '在连续语篇中根据上下文选择合适的单词或短语，考察语法结构和语境理解能力。'
    },
    {
      keywords: ['单项', '选择', 'multiple'],
      ability: '词汇语法基础',
      desc: '重点考察词汇辨析、时态语态、从句等基础语法知识的掌握与运用。'
    },
    {
      keywords: ['阅读', 'reading'],
      ability: '阅读理解能力',
      desc: '通过阅读英文短文获取事实信息、理解观点并进行推理判断，考察整体把握和细节理解。'
    },
    {
      keywords: ['语法填空', '语法', 'grammar'],
      ability: '语法结构运用',
      desc: '在句子或短文中灵活填入适当形式，考察对句式结构和语法规则的综合运用。'
    },
    {
      keywords: ['写作', '作文', 'writing'],
      ability: '书面表达能力',
      desc: '围绕给定情境进行条理清晰的英文表达，考察语法准确性、词汇多样性和篇章连贯性。'
    }
  ],
  defaultMapping: {
    ability: '综合语言运用',
    desc: '综合考察听、说、读、写等方面的语言技能和跨文化交际意识。'
  }
};

// ---------------------------------------------------------------------------------
// 统一获取逻辑
// ---------------------------------------------------------------------------------

export const getSubjectConfig = (subjectName: string = ''): SubjectConfig => {
  const s = subjectName.toLowerCase();
  if (s.includes('语文') || s.includes('chinese')) {
    return chineseConfig;
  }
  if (s.includes('英语') || s.includes('english')) {
    return englishConfig;
  }
  // 默认为数学，或者 fallback 到数学逻辑
  return mathConfig;
};

export const getAbilityInfoBySubject = (type: string, subjectName: string) => {
  const config = getSubjectConfig(subjectName);
  const t = (type || '').toLowerCase();
  
  for (const mapping of config.mappings) {
    if (mapping.keywords.some(k => t.includes(k.toLowerCase()))) {
      return {
        ability: mapping.ability,
        desc: mapping.desc
      };
    }
  }
  
  return config.defaultMapping;
};
