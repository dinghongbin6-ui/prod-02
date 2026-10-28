const HEADING_PATTERN = /^(?:第[一二三四五六七八九十百零〇\d]+[章节条款项篇].*|[（(][一二三四五六七八九十\d]+[）)].*|[一二三四五六七八九十]+、.*|【[^】]{1,40}】|.{1,32}[：:])$/u;

function splitLongParagraph(paragraph, maxSize) {
  const sentences = paragraph.split(/(?<=[。！？；;.!?])\s*/u).filter(Boolean);
  const pieces = [];
  let current = "";
  for (const sentence of sentences.length ? sentences : [paragraph]) {
    if (current && current.length + sentence.length > maxSize) {
      pieces.push(current);
      current = "";
    }
    if (sentence.length > maxSize) {
      if (current) pieces.push(current);
      current = "";
      for (let offset = 0; offset < sentence.length; offset += maxSize) {
        pieces.push(sentence.slice(offset, offset + maxSize));
      }
    } else {
      current += sentence;
    }
  }
  if (current) pieces.push(current);
  return pieces;
}

/** Paragraph-aware chunking that carries the nearest clause heading forward. */
export function splitText(text, chunkSize = 900, overlap = 140) {
  const lines = String(text || "")
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .map((line) => line.trim());

  const paragraphs = [];
  let heading = "";
  let buffered = [];
  const flush = () => {
    if (buffered.length) {
      paragraphs.push(heading ? `${heading}\n${buffered.join(" ")}` : buffered.join(" "));
      heading = "";
    }
    buffered = [];
  };

  for (const line of lines) {
    if (!line) {
      flush();
      continue;
    }
    if (line.length <= 48 && HEADING_PATTERN.test(line)) {
      flush();
      heading = line;
    } else {
      buffered.push(line);
      if (/[。！？；.!?]$/u.test(line)) flush();
    }
  }
  flush();

  const blocks = paragraphs.flatMap((paragraph) =>
    paragraph.length > chunkSize ? splitLongParagraph(paragraph, chunkSize) : [paragraph]
  );

  const chunks = [];
  let current = "";
  for (const block of blocks) {
    const candidate = current ? `${current}\n\n${block}` : block;
    if (current && candidate.length > chunkSize) {
      chunks.push(current);
      const tail = current.slice(Math.max(0, current.length - overlap));
      current = tail ? `${tail}\n\n${block}` : block;
    } else {
      current = candidate;
    }
    if (current.length > chunkSize) {
      chunks.push(current.slice(0, chunkSize));
      current = current.slice(Math.max(0, chunkSize - overlap));
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
