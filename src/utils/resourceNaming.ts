import * as path from 'path';

export const isAlternativeResourceFileName = (fileName: string): boolean => {
  const nameWithoutExt = path.basename(fileName, path.extname(fileName));
  return (
    fileName.includes('.o-') ||
    fileName.includes('-edited') ||
    / - 副本(?: \(\d+\))?$/.test(nameWithoutExt)
  );
};

