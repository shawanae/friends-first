export type PdfSection = {
  title: string;
  rows: Array<{ label: string; value: string }>;
};

export function shouldIncludeFriendsFirstPdfResponse(
  key: string,
  answers: Record<string, unknown>,
) {
  const hasText = (value: unknown) =>
    typeof value === 'string' && value.trim().length > 0;
  const includes = (value: unknown, option: string) =>
    Array.isArray(value) && value.includes(option);

  if (key === 'genderOther')
    return answers.gender === 'Prefer to Self-describe';
  if (key === 'religionOther') return answers.religion === 'Other';
  if (key === 'nicotineTypes')
    return hasText(answers.nicotine) && answers.nicotine !== 'No';
  if (key === 'cannabisTypes')
    return hasText(answers.cannabis) && answers.cannabis !== 'No';
  if (key === 'petTypes') return answers.pets === 'Yes';
  if (key === 'petOther')
    return answers.pets === 'Yes' && includes(answers.petTypes, 'Other');
  if (key === 'dateGenderOther') return includes(answers.dateGender, 'Other');
  if (key === 'datePoliticsOther')
    return includes(answers.datePolitics, 'Other');
  return true;
}

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

function escapePdfText(value: string) {
  return value.replace(/([\\()])/g, '\\$1');
}

function wrapText(
  value: string,
  maxCharacters: number,
  fontSize: number,
  bold = false,
) {
  if (/[^\x20-\x7E]/.test(value)) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to measure PDF text.');
    context.font = `${bold ? 'bold ' : ''}${fontSize}px Arial, sans-serif`;
    const lines: string[] = [];
    let current = '';
    const graphemes = new Intl.Segmenter(undefined, {
      granularity: 'grapheme',
    }).segment(value.trim().replace(/\s+/g, ' '));
    for (const { segment: character } of graphemes) {
      if (
        current &&
        context.measureText(current + character).width > PAGE_WIDTH - 2 * MARGIN
      ) {
        lines.push(current.trimEnd());
        current = character.trimStart();
      } else {
        current += character;
      }
    }
    lines.push(current || '');
    return lines;
  }
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
  const lines: string[] = [];
  let current = words[0];
  for (const word of words.slice(1)) {
    if (Array.from(`${current} ${word}`).length <= maxCharacters) {
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
      const wrappedLabels = wrapText(row.label, 86, 9, true);
      for (const [index, wrapped] of wrappedLabels.entries()) {
        lines.push({
          text: wrapped,
          font: 'bold',
          size: 9,
          gapAfter: index < wrappedLabels.length - 1 ? 1 : 2,
          keepWithNext: true,
        });
      }
      const wrappedLines = wrapText(row.value, 86, 10);
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

type PdfImage = { name: string; width: number; height: number; bytes: Uint8Array };

function imageForLine(line: PdfLine, name: string): PdfImage {
  const scale = 3;
  const width = PAGE_WIDTH - 2 * MARGIN;
  const height = line.size * 1.4;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to render PDF text.');
  context.scale(scale, scale);
  context.fillStyle = '#fff';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#111';
  context.font = `${line.font === 'bold' ? 'bold ' : ''}${line.size}px Arial, sans-serif`;
  context.fillText(line.text, 0, line.size);
  const encoded = canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
  const binary = atob(encoded);
  return {
    name,
    width: canvas.width,
    height: canvas.height,
    bytes: Uint8Array.from(binary, (character) => character.charCodeAt(0)),
  };
}

function pageStream(lines: PdfLine[], pageNumber: number, pageCount: number) {
  let y = START_Y;
  const commands: string[] = [];
  const images: PdfImage[] = [];
  for (const line of lines) {
    if (line.text) {
      if (/[^\x20-\x7E]/.test(line.text)) {
        const image = imageForLine(line, `Im${images.length + 1}`);
        images.push(image);
        const actualText = `FEFF${Array.from(
          { length: line.text.length },
          (_, index) => line.text.charCodeAt(index).toString(16).padStart(4, '0'),
        ).join('')}`;
        commands.push(
          `/Span << /ActualText <${actualText}> >> BDC q ${PAGE_WIDTH - 2 * MARGIN} 0 0 ${(line.size * 1.4).toFixed(2)} ${MARGIN} ${(y - line.size * 0.4).toFixed(2)} cm /${image.name} Do Q EMC`,
        );
      } else {
        const fontName = line.font === 'bold' ? 'F2' : 'F1';
        commands.push(
          `BT /${fontName} ${line.size} Tf 1 0 0 1 ${MARGIN} ${y.toFixed(2)} Tm (${escapePdfText(line.text)}) Tj ET`,
        );
      }
    }
    y -= line.size * 1.25 + line.gapAfter;
  }
  commands.push(
    `BT /F1 8 Tf 1 0 0 1 ${PAGE_WIDTH - 96} 30 Tm (Page ${pageNumber} of ${pageCount}) Tj ET`,
  );
  return { stream: commands.join('\n'), images };
}

export function buildFriendsFirstPdf(sections: PdfSection[]) {
  const pages = paginate(makeLines(sections));
  const encoder = new TextEncoder();
  const objects: Uint8Array[] = [];
  const encoded = (value: string) => encoder.encode(value);
  const join = (parts: Uint8Array[]) => {
    const result = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
    let offset = 0;
    for (const part of parts) {
      result.set(part, offset);
      offset += part.length;
    }
    return result;
  };
  const pageNumbers: number[] = [];
  objects[1] = encoded('<< /Type /Catalog /Pages 2 0 R >>');
  objects[3] = encoded('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  objects[4] = encoded('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  pages.forEach((page, index) => {
    const pageNumber = objects.length;
    pageNumbers.push(pageNumber);
    const { stream, images } = pageStream(page, index + 1, pages.length);
    const contentNumber = pageNumber + 1;
    const imageNumbers = images.map((_, imageIndex) => contentNumber + 1 + imageIndex);
    const imageResources = images.map((image, imageIndex) => `/${image.name} ${imageNumbers[imageIndex]} 0 R`).join(' ');
    objects[pageNumber] = encoded(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << ${imageResources} >> >> /Contents ${contentNumber} 0 R >>`,
    );
    const streamBytes = encoded(stream);
    objects[contentNumber] = join([
      encoded(`<< /Length ${streamBytes.length} >>\nstream\n`),
      streamBytes,
      encoded('\nendstream'),
    ]);
    images.forEach((image, imageIndex) => {
      objects[imageNumbers[imageIndex]] = join([
        encoded(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`),
        image.bytes,
        encoded('\nendstream'),
      ]);
    });
  });
  objects[2] = encoded(`<< /Type /Pages /Kids [${pageNumbers.map((number) => `${number} 0 R`).join(' ')}] /Count ${pages.length} >>`);

  const documentParts: Uint8Array[] = [encoded('%PDF-1.4\n')];
  const offsets = [0];
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = documentParts.reduce((size, part) => size + part.length, 0);
    documentParts.push(encoded(`${index} 0 obj\n`), objects[index], encoded('\nendobj\n'));
  }
  const xrefOffset = documentParts.reduce((size, part) => size + part.length, 0);
  let trailer = `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < objects.length; index += 1) {
    trailer += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  trailer +=
    `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\n` +
    `startxref\n${xrefOffset}\n%%EOF\n`;
  documentParts.push(encoded(trailer));
  return join(documentParts);
}
