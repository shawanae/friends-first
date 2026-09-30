export type PdfSection = {
  title: string;
  rows: Array<{ label: string; value: string }>;
};

type PdfLine = {
  text: string;
  font: 'regular' | 'bold';
  size: number;
  gapAfter: number;
  keepWithNext?: boolean;
};

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const START_Y = 738;
const BOTTOM_Y = 54;

function asciiText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00b7/g, '-')
    .replace(/[^\x20-\x7E]/g, '');
}

function escapePdfText(value: string) {
  return asciiText(value).replace(/([\\()])/g, '\\$1');
}

function wrapText(value: string, maxCharacters: number) {
  const words = asciiText(value).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
  const lines: string[] = [];
  let current = words[0];
  for (const word of words.slice(1)) {
    if (`${current} ${word}`.length <= maxCharacters) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  lines.push(current);
  return lines;
}

function makeLines(sections: PdfSection[]) {
  const lines: PdfLine[] = [
    { text: 'Friends First', font: 'bold', size: 22, gapAfter: 6 },
    {
      text: `Private response summary - ${new Date().toLocaleDateString('en-US')}`,
      font: 'regular',
      size: 10,
      gapAfter: 18,
    },
  ];

  for (const section of sections) {
    lines.push({
      text: section.title,
      font: 'bold',
      size: 15,
      gapAfter: 7,
      keepWithNext: true,
    });
    for (const row of section.rows) {
      lines.push({
        text: row.label,
        font: 'bold',
        size: 9,
        gapAfter: 2,
        keepWithNext: true,
      });
      const wrappedLines = wrapText(row.value, 86);
      for (const [index, wrapped] of wrappedLines.entries()) {
        lines.push({
          text: wrapped,
          font: 'regular',
          size: 10,
          gapAfter: 1,
          keepWithNext: index < wrappedLines.length - 1,
        });
      }
      lines.push({ text: '', font: 'regular', size: 5, gapAfter: 5 });
    }
    lines.push({ text: '', font: 'regular', size: 5, gapAfter: 8 });
  }
  return lines;
}

function paginate(lines: PdfLine[]) {
  const pages: PdfLine[][] = [];
  let current: PdfLine[] = [];
  let y = START_Y;
  for (const [index, line] of lines.entries()) {
    const lineHeight = line.size * 1.25 + line.gapAfter;
    let keptBlockHeight = lineHeight;
    let nextIndex = index;
    while (lines[nextIndex]?.keepWithNext && lines[nextIndex + 1]) {
      nextIndex += 1;
      keptBlockHeight +=
        lines[nextIndex].size * 1.25 + lines[nextIndex].gapAfter;
    }
    if (current.length > 0 && y - keptBlockHeight < BOTTOM_Y) {
      pages.push(current);
      current = [];
      y = START_Y;
    }
    current.push(line);
    y -= lineHeight;
  }
  if (current.length > 0) pages.push(current);
  return pages;
}

function pageStream(lines: PdfLine[], pageNumber: number, pageCount: number) {
  let y = START_Y;
  const commands: string[] = [];
  for (const line of lines) {
    if (line.text) {
      const fontName = line.font === 'bold' ? 'F2' : 'F1';
      commands.push(
        `BT /${fontName} ${line.size} Tf 1 0 0 1 ${MARGIN} ${y.toFixed(2)} Tm (${escapePdfText(line.text)}) Tj ET`,
      );
    }
    y -= line.size * 1.25 + line.gapAfter;
  }
  commands.push(
    `BT /F1 8 Tf 1 0 0 1 ${PAGE_WIDTH - 96} 30 Tm (Page ${pageNumber} of ${pageCount}) Tj ET`,
  );
  return commands.join('\n');
}

export function buildFriendsFirstPdf(sections: PdfSection[]) {
  const pages = paginate(makeLines(sections));
  const objects: string[] = [];
  const pageObjectNumbers = pages.map((_, index) => 5 + index * 2);

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';

  pages.forEach((page, index) => {
    const pageNumber = 5 + index * 2;
    const contentNumber = pageNumber + 1;
    const stream = pageStream(page, index + 1, pages.length);
    objects[pageNumber] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNumber} 0 R >>`;
    objects[contentNumber] =
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  let document = '%PDF-1.4\n';
  const offsets = [0];
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = document.length;
    document += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefOffset = document.length;
  document += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < objects.length; index += 1) {
    document += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  document +=
    `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\n` +
    `startxref\n${xrefOffset}\n%%EOF\n`;
  return new TextEncoder().encode(document);
}
