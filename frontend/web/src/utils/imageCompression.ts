// =================================================================================
// 图片压缩工具 (Image Compression)
// 用于移动端图片上传前的压缩处理
// =================================================================================

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
}

/**
 * 压缩图片
 * @param file 原始图片文件
 * @param options 压缩选项
 * @returns 压缩后的Blob
 */
export const compressImage = async (
  file: File,
  options: CompressionOptions = {}
): Promise<Blob> => {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
    mimeType = 'image/jpeg',
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onerror = () => reject(new Error('文件读取失败'));
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onerror = () => reject(new Error('图片加载失败'));
      
      img.onload = () => {
        try {
          // 计算新尺寸
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }

          // 创建canvas
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context创建失败'));
            return;
          }

          // 绘制图片
          ctx.drawImage(img, 0, 0, width, height);

          // 转换为Blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('图片压缩失败'));
              }
            },
            mimeType,
            quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
};

/**
 * 批量压缩图片
 * @param files 图片文件数组
 * @param options 压缩选项
 * @returns 压缩后的Blob数组
 */
export const compressImages = async (
  files: File[],
  options: CompressionOptions = {}
): Promise<Blob[]> => {
  return Promise.all(files.map(file => compressImage(file, options)));
};

/**
 * 获取图片尺寸
 * @param file 图片文件
 * @returns 图片宽高
 */
export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onerror = () => reject(new Error('文件读取失败'));
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onerror = () => reject(new Error('图片加载失败'));
      
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
};

/**
 * 计算压缩后的文件大小（估算）
 * @param originalSize 原始文件大小（字节）
 * @param quality 压缩质量（0-1）
 * @returns 估算的压缩后大小（字节）
 */
export const estimateCompressedSize = (originalSize: number, quality: number): number => {
  // 简单估算：压缩后大小约为原始大小的 quality * 0.7
  return Math.round(originalSize * quality * 0.7);
};

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的字符串（如 "1.5 MB"）
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};
