// =================================================================================
// 动画辅助函数 (Animation Helpers)
// 提供统一的动画缓动函数和时序配置
// =================================================================================

/**
 * 缓动函数
 * 提供常用的 CSS cubic-bezier 缓动曲线
 */
export const easing = {
  // 标准缓动
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  
  // 特殊效果
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  elastic: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  
  // 平滑过渡
  smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
} as const;

/**
 * 动画时序（毫秒）
 */
export const duration = {
  instant: 0,
  fast: 200,
  normal: 300,
  slow: 500,
  slower: 700,
} as const;

/**
 * 延迟时序（毫秒）
 */
export const delay = {
  none: 0,
  short: 100,
  medium: 200,
  long: 300,
} as const;

/**
 * 生成 CSS transition 字符串
 */
export function createTransition(
  property: string | string[],
  durationMs: number = duration.normal,
  easingFn: string = easing.easeInOut,
  delayMs: number = 0
): string {
  const properties = Array.isArray(property) ? property : [property];
  return properties
    .map(prop => `${prop} ${durationMs}ms ${easingFn} ${delayMs}ms`)
    .join(', ');
}

/**
 * 生成 CSS animation 字符串
 */
export function createAnimation(
  name: string,
  durationMs: number = duration.normal,
  easingFn: string = easing.easeInOut,
  delayMs: number = 0,
  iterationCount: number | 'infinite' = 1,
  direction: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse' = 'normal'
): string {
  return `${name} ${durationMs}ms ${easingFn} ${delayMs}ms ${iterationCount} ${direction}`;
}

/**
 * 淡入动画
 */
export function fadeIn(durationMs: number = duration.normal): React.CSSProperties {
  return {
    animation: createAnimation('fadeIn', durationMs, easing.easeOut),
  };
}

/**
 * 淡出动画
 */
export function fadeOut(durationMs: number = duration.normal): React.CSSProperties {
  return {
    animation: createAnimation('fadeOut', durationMs, easing.easeIn),
  };
}

/**
 * 滑入动画（从下方）
 */
export function slideInUp(durationMs: number = duration.normal): React.CSSProperties {
  return {
    animation: createAnimation('slideInUp', durationMs, easing.easeOut),
  };
}

/**
 * 滑入动画（从右侧）
 */
export function slideInRight(durationMs: number = duration.normal): React.CSSProperties {
  return {
    animation: createAnimation('slideInRight', durationMs, easing.easeOut),
  };
}

/**
 * 缩放动画
 */
export function scaleIn(durationMs: number = duration.normal): React.CSSProperties {
  return {
    animation: createAnimation('scaleIn', durationMs, easing.bounce),
  };
}

/**
 * 弹跳动画
 */
export function bounce(durationMs: number = duration.slow): React.CSSProperties {
  return {
    animation: createAnimation('bounce', durationMs, easing.easeInOut, 0, 'infinite'),
  };
}

/**
 * 脉冲动画
 */
export function pulse(durationMs: number = duration.slower): React.CSSProperties {
  return {
    animation: createAnimation('pulse', durationMs, easing.easeInOut, 0, 'infinite'),
  };
}

/**
 * 摇晃动画
 */
export function shake(durationMs: number = duration.slow): React.CSSProperties {
  return {
    animation: createAnimation('shake', durationMs, easing.easeInOut),
  };
}

/**
 * 延迟执行动画
 */
export function delayedAnimation(
  callback: () => void,
  delayMs: number = delay.medium
): number {
  return window.setTimeout(callback, delayMs);
}

/**
 * 使用 requestAnimationFrame 执行动画
 */
export function animationFrame(callback: () => void): number {
  return requestAnimationFrame(callback);
}

/**
 * 取消动画帧
 */
export function cancelAnimationFrame(id: number): void {
  window.cancelAnimationFrame(id);
}

/**
 * 平滑滚动到元素
 */
export function smoothScrollTo(
  element: HTMLElement | null,
  options?: ScrollIntoViewOptions
): void {
  if (!element) return;
  
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'nearest',
    ...options,
  });
}

/**
 * 平滑滚动到顶部
 */
export function smoothScrollToTop(durationMs: number = duration.slow): void {
  const start = window.pageYOffset;
  const startTime = performance.now();

  function scroll(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / durationMs, 1);
    
    // 使用 easeInOut 缓动
    const easeProgress = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    
    window.scrollTo(0, start * (1 - easeProgress));

    if (progress < 1) {
      requestAnimationFrame(scroll);
    }
  }

  requestAnimationFrame(scroll);
}
