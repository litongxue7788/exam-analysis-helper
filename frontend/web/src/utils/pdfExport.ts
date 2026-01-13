// =================================================================================
// PDF 导出工具 - 将分析报告导出为 PDF
// =================================================================================

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface PDFExportOptions {
  filename?: string;
  quality?: number;
  scale?: number;
  onProgress?: (progress: number) => void;
}

/**
 * 将 HTML 元素导出为 PDF
 * @param element 要导出的 HTML 元素
 * @param options 导出选项
 */
export async function exportToPDF(
  element: HTMLElement,
  options: PDFExportOptions = {}
): Promise<void> {
  const {
    filename = '试卷分析报告.pdf',
    quality = 0.95,
    scale = 2,
    onProgress
  } = options;

  try {
    // 1. 报告进度：开始生成
    onProgress?.(10);

    // 2. 使用 html2canvas 将 HTML 转换为 Canvas
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      imageTimeout: 0,
      onclone: (clonedDoc) => {
        // 优化克隆文档的样式
        const clonedElement = clonedDoc.querySelector('.report-layout') as HTMLElement;
        if (clonedElement) {
          // 移除固定定位的元素（如顶部栏、底部栏）
          const fixedElements = clonedElement.querySelectorAll('.context-bar, .action-dock, .toast-float');
          fixedElements.forEach(el => el.remove());
          
          // 确保内容可见
          clonedElement.style.paddingTop = '20px';
          clonedElement.style.paddingBottom = '20px';
        }
      }
    });

    onProgress?.(50);

    // 3. 获取 Canvas 尺寸
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // 4. 计算 PDF 页面尺寸（A4 纸张）
    const pdfWidth = 210; // A4 宽度（mm）
    const pdfHeight = 297; // A4 高度（mm）
    const ratio = imgWidth / imgHeight;
    
    // 计算适合 A4 的尺寸
    let contentWidth = pdfWidth - 20; // 左右各留 10mm 边距
    let contentHeight = contentWidth / ratio;

    // 5. 创建 PDF 文档
    const pdf = new jsPDF({
      orientation: contentHeight > pdfHeight - 20 ? 'portrait' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    onProgress?.(70);

    // 6. 将 Canvas 转换为图片数据
    const imgData = canvas.toDataURL('image/jpeg', quality);

    // 7. 计算需要的页数
    const pageHeight = pdfHeight - 20; // 上下各留 10mm 边距
    const totalPages = Math.ceil(contentHeight / pageHeight);

    // 8. 分页添加内容
    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        pdf.addPage();
      }

      const yOffset = -page * pageHeight;
      
      pdf.addImage(
        imgData,
        'JPEG',
        10, // x 位置（左边距）
        10 + yOffset, // y 位置
        contentWidth,
        contentHeight,
        undefined,
        'FAST'
      );

      // 添加页码
      pdf.setFontSize(10);
      pdf.setTextColor(150);
      pdf.text(
        `第 ${page + 1} 页 / 共 ${totalPages} 页`,
        pdfWidth / 2,
        pdfHeight - 5,
        { align: 'center' }
      );

      onProgress?.(70 + (page + 1) / totalPages * 25);
    }

    onProgress?.(95);

    // 9. 保存 PDF
    pdf.save(filename);

    onProgress?.(100);
  } catch (error) {
    console.error('PDF 导出失败:', error);
    throw new Error('PDF 导出失败，请重试');
  }
}

/**
 * 简化版：快速导出当前页面为 PDF
 */
export async function quickExportToPDF(
  filename?: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  const reportElement = document.querySelector('.report-layout') as HTMLElement;
  
  if (!reportElement) {
    throw new Error('未找到报告内容');
  }

  await exportToPDF(reportElement, {
    filename,
    onProgress
  });
}
