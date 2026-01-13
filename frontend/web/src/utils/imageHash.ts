// =================================================================================
// 图片哈希工具 (imageHash.ts)
// =================================================================================
// 功能: 计算图片内容的哈希值，用于缓存识别
// 依赖: crypto-js
// =================================================================================

import CryptoJS from 'crypto-js';

/**
 * 计算图片文件的 SHA-256 哈希值
 * @param file 图片文件
 * @returns Promise<string> 哈希值（十六进制字符串）
 */
export const calculateImageHash = async (file: File): Promise<string> => {
  try {
    // 读取文件内容为 ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // 转换为 WordArray（crypto-js 格式）
    const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer as any);
    
    // 计算 SHA-256 哈希
    const hash = CryptoJS.SHA256(wordArray);
    
    // 转换为十六进制字符串
    return hash.toString(CryptoJS.enc.Hex);
  } catch (error) {
    console.error('计算图片哈希失败:', error);
    // 降级方案：使用文件名 + 大小 + 修改时间
    return `fallback-${file.name}-${file.size}-${file.lastModified}`;
  }
};

/**
 * 批量计算多个图片的哈希值
 * @param files 图片文件数组
 * @returns Promise<string[]> 哈希值数组
 */
export const calculateMultipleImageHashes = async (files: File[]): Promise<string[]> => {
  const promises = files.map(file => calculateImageHash(file));
  return Promise.all(promises);
};

/**
 * 计算图片组合的哈希值（用于多图片缓存）
 * @param files 图片文件数组
 * @returns Promise<string> 组合哈希值
 */
export const calculateCombinedHash = async (files: File[]): Promise<string> => {
  try {
    // 计算每个文件的哈希
    const hashes = await calculateMultipleImageHashes(files);
    
    // 按文件名排序（确保顺序一致）
    const sortedHashes = hashes
      .map((hash, index) => ({ hash, name: files[index].name }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(item => item.hash);
    
    // 组合所有哈希值
    const combined = sortedHashes.join('-');
    
    // 计算组合哈希的哈希值
    const finalHash = CryptoJS.SHA256(combined);
    
    return finalHash.toString(CryptoJS.enc.Hex);
  } catch (error) {
    console.error('计算组合哈希失败:', error);
    // 降级方案
    const fallback = files.map(f => `${f.name}-${f.size}`).join('-');
    return `fallback-${CryptoJS.MD5(fallback).toString(CryptoJS.enc.Hex)}`;
  }
};
