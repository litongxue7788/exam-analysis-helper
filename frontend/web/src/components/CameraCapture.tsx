// =================================================================================
// 相机拍照组件 (CameraCapture)
// 支持移动端调用相机拍照上传
// =================================================================================

import React, { useRef, useState } from 'react';
import { Camera, RotateCcw, Check, X } from 'lucide-react';
import { compressImage, formatFileSize } from '../utils/imageCompression';
import './CameraCapture.css';

interface CameraCaptureProps {
  onCapture: (file: Blob) => void;
  onCancel?: () => void;
  maxSize?: number; // 最大文件大小（字节）
  quality?: number; // 压缩质量（0-1）
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  onCancel,
  maxSize = 5 * 1024 * 1024, // 默认5MB
  quality = 0.8,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [compressing, setCompressing] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 显示预览
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setOriginalFile(file);
  };

  const handleConfirm = async () => {
    if (!originalFile) return;

    setCompressing(true);
    try {
      // 压缩图片
      const compressed = await compressImage(originalFile, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality,
      });

      // 检查文件大小
      if (compressed.size > maxSize) {
        alert(`图片过大（${formatFileSize(compressed.size)}），请重新拍照`);
        handleRetake();
        return;
      }

      onCapture(compressed);
      setPreview(null);
      setOriginalFile(null);
    } catch (error) {
      console.error('图片压缩失败:', error);
      alert('图片处理失败，请重试');
    } finally {
      setCompressing(false);
    }
  };

  const handleRetake = () => {
    setPreview(null);
    setOriginalFile(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleCancel = () => {
    handleRetake();
    onCancel?.();
  };

  const triggerCamera = () => {
    inputRef.current?.click();
  };

  return (
    <div className="camera-capture">
      {/* 隐藏的文件输入 */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment" // 后置摄像头
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {!preview ? (
        /* 拍照按钮 */
        <button
          className="camera-trigger-btn"
          onClick={triggerCamera}
          type="button"
        >
          <Camera size={24} />
          <span>拍照上传</span>
        </button>
      ) : (
        /* 预览和操作 */
        <div className="camera-preview-container">
          <div className="camera-preview">
            <img src={preview} alt="预览" />
            {compressing && (
              <div className="camera-loading">
                <div className="spinner" />
                <span>压缩中...</span>
              </div>
            )}
          </div>

          <div className="camera-actions">
            <button
              className="camera-action-btn secondary"
              onClick={handleRetake}
              disabled={compressing}
              type="button"
            >
              <RotateCcw size={20} />
              <span>重拍</span>
            </button>

            <button
              className="camera-action-btn primary"
              onClick={handleConfirm}
              disabled={compressing}
              type="button"
            >
              <Check size={20} />
              <span>确认</span>
            </button>

            <button
              className="camera-action-btn secondary"
              onClick={handleCancel}
              disabled={compressing}
              type="button"
            >
              <X size={20} />
              <span>取消</span>
            </button>
          </div>

          {originalFile && (
            <div className="camera-info">
              <span>原始大小: {formatFileSize(originalFile.size)}</span>
              <span>压缩质量: {Math.round(quality * 100)}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
