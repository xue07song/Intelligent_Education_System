export const downloadBlob = (blob, filename) => {
  if (!(blob instanceof Blob) || blob.size === 0) {
    throw new Error('导出文件为空，请稍后重试');
  }
  const safeFilename = String(filename || '试卷.docx').replace(/[\\/:*?"<>|]/g, '_');
  if (typeof navigator.msSaveOrOpenBlob === 'function') {
    navigator.msSaveOrOpenBlob(blob, safeFilename);
    return safeFilename;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeFilename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // 部分浏览器在文件较大时需要更长时间读取 Blob，过早释放会造成下载不完整。
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return safeFilename;
};
