interface MingliDetail {
  source: string;
  type: 'text' | 'image';
  value: number;
  mingli: number;
}

export interface MingliResult {
  totalMingli: number;
  details: MingliDetail[];
}

export interface FlameLevel {
  name: string;
  description: string;
}

function countWords(text: string): number {
  const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const english = text
    .replace(/[\u4e00-\u9fff]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
  return chinese + english;
}

async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return result.value;
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  let text = '';

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const content = await page.getTextContent();
    text += ` ${(content.items as Array<{ str?: string }>).map((item) => item.str || '').join(' ')}`;
  }

  return text;
}

function extractMdText(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#*>\-_~|]/g, ' ')
    .replace(/\n+/g, ' ');
}

async function parseFileToDetail(file: File): Promise<MingliDetail | null> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
    return {
      source: file.name,
      type: 'image',
      value: 1,
      mingli: 5,
    };
  }

  let text = '';

  if (ext === 'doc' || ext === 'docx') {
    text = await extractDocxText(file);
  } else if (ext === 'pdf') {
    text = await extractPdfText(file);
  } else if (ext === 'md') {
    text = extractMdText(await file.text());
  } else if (['txt', 'log', 'json', 'xml', 'csv'].includes(ext)) {
    text = await file.text();
  } else {
    return null;
  }

  const words = countWords(text);
  return {
    source: file.name,
    type: 'text',
    value: words,
    mingli: Math.max(1, Math.ceil(words / 100)),
  };
}

export async function calculateMingli(textInput: string, files: File[]): Promise<MingliResult> {
  const details: MingliDetail[] = [];

  if (textInput.trim()) {
    const words = countWords(textInput);
    details.push({
      source: '手写祭文',
      type: 'text',
      value: words,
      mingli: Math.max(1, Math.ceil(words / 100)),
    });
  }

  for (const file of files) {
    try {
      const detail = await parseFileToDetail(file);
      if (detail) {
        details.push(detail);
      }
    } catch {
      // ignore parsing failures, keeping ritual uninterrupted
    }
  }

  return {
    totalMingli: details.reduce((sum, detail) => sum + detail.mingli, 0),
    details,
  };
}

export function mingliToFlameIntensity(mingli: number): number {
  if (mingli <= 0) return 0.65;  // Default visible idle flame
  if (mingli <= 5) return 0.75;
  if (mingli <= 20) return 0.85;
  if (mingli <= 50) return 0.92;
  if (mingli <= 100) return 0.98;
  return 1;
}

export function getFlameLevel(mingli: number): FlameLevel {
  if (mingli <= 0) return { name: '无火', description: '唯余灰烬轻闪' };
  if (mingli <= 5) return { name: '烛火', description: '一簇小火，温柔摇曳' };
  if (mingli <= 20) return { name: '小火', description: '火苗已成，缓缓吞纸' };
  if (mingli <= 50) return { name: '中火', description: '火势渐盛，焰心跳动' };
  if (mingli <= 100) return { name: '大火', description: '火光满堂，纸影尽燃' };
  return { name: '烈焰', description: '火势冲天，尽化虚无' };
}
