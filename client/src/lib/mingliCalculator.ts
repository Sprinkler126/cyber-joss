// lib/mingliCalculator.ts

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

function countWords(text: string): number {
  const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const english = text.replace(/[\u4e00-\u9fff]/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
  return chinese + english;
}

async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return result.value;
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += (content.items as any[]).map((item: any) => item.str).join(' ');
  }
  return text;
}

function extractMdText(raw: string): string {
  return raw.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '').replace(/!\[.*?\]\(.*?\)/g, '').replace(/\[.*?\]\(.*?\)/g, '$1').replace(/[#*>\-_~|]/g, '').replace(/\n+/g, ' ');
}

export async function calculateMingli(textInput: string, files: File[]): Promise<MingliResult> {
  const details: MingliDetail[] = [];
  if (textInput.trim()) {
    const words = countWords(textInput);
    details.push({ source: '手写祭文', type: 'text', value: words, mingli: Math.ceil(words / 100) });
  }
  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    try {
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
        details.push({ source: file.name, type: 'image', value: 1, mingli: 5 });
      } else if (ext === 'docx' || ext === 'doc') {
        const text = await extractDocxText(file);
        details.push({ source: file.name, type: 'text', value: countWords(text), mingli: Math.ceil(countWords(text) / 100) });
      } else if (ext === 'pdf') {
        const text = await extractPdfText(file);
        details.push({ source: file.name, type: 'text', value: countWords(text), mingli: Math.ceil(countWords(text) / 100) });
      } else if (ext === 'md') {
        const text = extractMdText(await file.text());
        details.push({ source: file.name, type: 'text', value: countWords(text), mingli: Math.ceil(countWords(text) / 100) });
      } else if (['txt', 'log', 'json', 'xml', 'csv'].includes(ext)) {
        const text = await file.text();
        details.push({ source: file.name, type: 'text', value: countWords(text), mingli: Math.ceil(countWords(text) / 100) });
      }
    } catch (e) { console.warn(`解析 ${file.name} 失败:`, e); }
  }
  return { totalMingli: details.reduce((s, d) => s + d.mingli, 0), details };
}
