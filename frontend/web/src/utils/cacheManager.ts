// =================================================================================
// 缓存管理工具 (cacheManager.ts)
// =================================================================================
// 功能: 管理分析结果缓存，提升重复分析速度
// 存储: IndexedDB
// 过期时间: 7天
// =================================================================================

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// 缓存数据结构
export interface CacheEntry {
  hash: string;                    // 图片哈希值（主键）
  timestamp: string;               // 缓存时间（ISO 格式）
  expiresAt: string;               // 过期时间（ISO 格式）
  studentInfo: {
    name: string;
    grade: string;
    subject: string;
    examName: string;
  };
  result: any;                     // 分析结果（完整数据）
}

// IndexedDB Schema
interface CacheDB extends DBSchema {
  'exam-cache': {
    key: string;                   // hash
    value: CacheEntry;
    indexes: {
      'by-timestamp': string;      // 按时间索引
      'by-expires': string;        // 按过期时间索引
    };
  };
}

// 数据库名称和版本
const DB_NAME = 'exam-analysis-cache';
const DB_VERSION = 1;
const STORE_NAME = 'exam-cache';

// 缓存过期时间（7天）
const CACHE_EXPIRY_DAYS = 7;
const CACHE_EXPIRY_MS = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

// 最大缓存数量
const MAX_CACHE_ENTRIES = 50;

/**
 * 初始化数据库
 */
const initDB = async (): Promise<IDBPDatabase<CacheDB>> => {
  return openDB<CacheDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 创建对象存储
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'hash' });
        
        // 创建索引
        store.createIndex('by-timestamp', 'timestamp');
        store.createIndex('by-expires', 'expiresAt');
      }
    },
  });
};

/**
 * 检查缓存是否存在且未过期
 * @param hash 图片哈希值
 * @returns Promise<CacheEntry | null> 缓存条目或 null
 */
export const checkCache = async (hash: string): Promise<CacheEntry | null> => {
  try {
    const db = await initDB();
    const entry = await db.get(STORE_NAME, hash);
    
    if (!entry) {
      return null;
    }
    
    // 检查是否过期
    const now = new Date();
    const expiresAt = new Date(entry.expiresAt);
    
    if (now > expiresAt) {
      // 已过期，删除缓存
      await db.delete(STORE_NAME, hash);
      return null;
    }
    
    return entry;
  } catch (error) {
    console.error('检查缓存失败:', error);
    return null;
  }
};

/**
 * 保存分析结果到缓存
 * @param hash 图片哈希值
 * @param studentInfo 学生信息
 * @param result 分析结果
 * @returns Promise<boolean> 是否成功
 */
export const saveCache = async (
  hash: string,
  studentInfo: {
    name: string;
    grade: string;
    subject: string;
    examName: string;
  },
  result: any
): Promise<boolean> => {
  try {
    const db = await initDB();
    
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CACHE_EXPIRY_MS);
    
    const entry: CacheEntry = {
      hash,
      timestamp: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      studentInfo,
      result,
    };
    
    await db.put(STORE_NAME, entry);
    
    // 清理超出限制的旧缓存
    await cleanupOldCache();
    
    return true;
  } catch (error) {
    console.error('保存缓存失败:', error);
    return false;
  }
};

/**
 * 清理过期缓存
 * @returns Promise<number> 清理的条目数
 */
export const cleanupExpiredCache = async (): Promise<number> => {
  try {
    const db = await initDB();
    const now = new Date().toISOString();
    
    // 获取所有过期的条目
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const index = tx.store.index('by-expires');
    
    let count = 0;
    let cursor = await index.openCursor(IDBKeyRange.upperBound(now));
    
    while (cursor) {
      await cursor.delete();
      count++;
      cursor = await cursor.continue();
    }
    
    await tx.done;
    
    return count;
  } catch (error) {
    console.error('清理过期缓存失败:', error);
    return 0;
  }
};

/**
 * 清理超出限制的旧缓存
 * @returns Promise<number> 清理的条目数
 */
export const cleanupOldCache = async (): Promise<number> => {
  try {
    const db = await initDB();
    
    // 获取所有条目（按时间排序）
    const allEntries = await db.getAllFromIndex(STORE_NAME, 'by-timestamp');
    
    // 如果超出限制，删除最旧的条目
    if (allEntries.length > MAX_CACHE_ENTRIES) {
      const toDelete = allEntries.slice(0, allEntries.length - MAX_CACHE_ENTRIES);
      
      const tx = db.transaction(STORE_NAME, 'readwrite');
      for (const entry of toDelete) {
        await tx.store.delete(entry.hash);
      }
      await tx.done;
      
      return toDelete.length;
    }
    
    return 0;
  } catch (error) {
    console.error('清理旧缓存失败:', error);
    return 0;
  }
};

/**
 * 获取缓存统计信息
 * @returns Promise<{ total: number; expired: number; size: string }>
 */
export const getCacheStats = async (): Promise<{
  total: number;
  expired: number;
  size: string;
}> => {
  try {
    const db = await initDB();
    const allEntries = await db.getAll(STORE_NAME);
    
    const now = new Date();
    const expired = allEntries.filter(entry => {
      const expiresAt = new Date(entry.expiresAt);
      return now > expiresAt;
    }).length;
    
    // 估算大小（粗略）
    const sizeBytes = JSON.stringify(allEntries).length;
    const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
    
    return {
      total: allEntries.length,
      expired,
      size: `${sizeMB} MB`,
    };
  } catch (error) {
    console.error('获取缓存统计失败:', error);
    return {
      total: 0,
      expired: 0,
      size: '0 MB',
    };
  }
};

/**
 * 清空所有缓存
 * @returns Promise<boolean> 是否成功
 */
export const clearAllCache = async (): Promise<boolean> => {
  try {
    const db = await initDB();
    await db.clear(STORE_NAME);
    return true;
  } catch (error) {
    console.error('清空缓存失败:', error);
    return false;
  }
};

/**
 * 删除指定缓存
 * @param hash 图片哈希值
 * @returns Promise<boolean> 是否成功
 */
export const deleteCache = async (hash: string): Promise<boolean> => {
  try {
    const db = await initDB();
    await db.delete(STORE_NAME, hash);
    return true;
  } catch (error) {
    console.error('删除缓存失败:', error);
    return false;
  }
};

/**
 * 获取所有缓存条目（用于调试）
 * @returns Promise<CacheEntry[]>
 */
export const getAllCacheEntries = async (): Promise<CacheEntry[]> => {
  try {
    const db = await initDB();
    return await db.getAll(STORE_NAME);
  } catch (error) {
    console.error('获取所有缓存失败:', error);
    return [];
  }
};

// 自动清理过期缓存（每次导入时执行一次）
cleanupExpiredCache().catch(err => {
  console.warn('自动清理过期缓存失败:', err);
});
