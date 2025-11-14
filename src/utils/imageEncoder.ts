/**
 * 图片编码工具 - 将本地图片转为 Base64 Data URL
 */

import * as fs from 'fs';
import * as path from 'path';

const mimeMap: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.bmp': 'image/bmp',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
  '.webp': 'image/webp'
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return mimeMap[ext] || 'image/png';
}

/**
 * 将本地图片文件转为 Base64 Data URL 字符串
 * 例如：data:image/png;base64,xxxx
 */
export async function imageToBase64(imagePath: string): Promise<string> {
  const buffer = await fs.promises.readFile(imagePath);
  const base64 = buffer.toString('base64');
  const mime = getMimeType(imagePath);
  return `data:${mime};base64,${base64}`;
}

/**
 * 批量转换多个图片
 */
export async function imagesToBase64(imagePaths: string[]): Promise<string[]> {
  return Promise.all(imagePaths.map(p => imageToBase64(p)));
}

