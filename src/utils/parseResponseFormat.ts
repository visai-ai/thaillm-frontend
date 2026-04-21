/**
 * Utility functions to parse and handle the special response format:
 * <response>...</response>
 * <reference><cite>1</cite><cite>2</cite></reference>
 */

export interface ParsedResponse {
  response: string;
  citations: number[];
  rawContent: string;
  /** Mapping from original cite number to renumbered (1-based sequential) number */
  citationRenumberMap?: Record<number, number>;
}

const KNOWN_TAGS = ["response", "reference", "cite"] as const;

/**
 * Remaps citationReferences keys using a renumber map from parseResponseFormat.
 * e.g. { 3: {url,title}, 7: {url,title} } with map {3:1, 7:2} => { 1: {url,title}, 2: {url,title} }
 */
export function remapCitationReferences(
  refs: Record<number, { url: string; title?: string }> | undefined | null,
  renumberMap: Record<number, number> | undefined,
): Record<number, { url: string; title?: string }> | undefined {
  if (!refs || !renumberMap) return refs ?? undefined;
  const remapped: Record<number, { url: string; title?: string }> = {};
  for (const [origStr, value] of Object.entries(refs)) {
    const orig = Number(origStr);
    const newNum = renumberMap[orig];
    if (newNum !== undefined) {
      remapped[newNum] = value;
    } else {
      remapped[orig] = value;
    }
  }
  return Object.keys(remapped).length > 0 ? remapped : undefined;
}

/**
 * Checks if content contains an incomplete tag (opening or closing)
 */
export function hasIncompleteTag(content: string): boolean {
  // Check if there's a < that might be part of a tag
  const lastOpenBracket = content.lastIndexOf("<");
  const lastCloseBracket = content.lastIndexOf(">");

  // If we have a < without a matching >, we might have an incomplete tag
  if (lastOpenBracket > lastCloseBracket) {
    const afterBracket = content.slice(lastOpenBracket);
    const lowerAfterBracket = afterBracket.toLowerCase();
    // Full or partial known opening/closing tags
    if (
      lowerAfterBracket.startsWith("<response") ||
      lowerAfterBracket.startsWith("</response") ||
      lowerAfterBracket.startsWith("<reference") ||
      lowerAfterBracket.startsWith("</reference") ||
      lowerAfterBracket.startsWith("<cite") ||
      lowerAfterBracket.startsWith("</cite")
    ) {
      return true;
    }
    // Incomplete tag name (e.g. <c, </c, </, <r) from chunked SSE
    const tagName = afterBracket
      .replace(/^<\/?/, "")
      .replace(/[\s\n]+$/, "")
      .toLowerCase();
    if (KNOWN_TAGS.some((t) => t.startsWith(tagName))) {
      return true;
    }
    return false;
  }

  // Special case: if we have "response" or "reference" followed by whitespace/newline
  // but no > yet, it's still incomplete (handles cases like "<response\n" or "<response ")
  if (lastOpenBracket !== -1) {
    const afterBracket = content.slice(lastOpenBracket);
    const lowerAfterBracket = afterBracket.toLowerCase();
    // Check for incomplete tags that might have whitespace/newline before the closing >
    if (
      (lowerAfterBracket.startsWith("<response") ||
        lowerAfterBracket.startsWith("</response") ||
        lowerAfterBracket.startsWith("<reference") ||
        lowerAfterBracket.startsWith("</reference") ||
        lowerAfterBracket.startsWith("<cite") ||
        lowerAfterBracket.startsWith("</cite")) &&
      !afterBracket.includes(">")
    ) {
      // Check if we have whitespace/newline after the tag name (like "response\n" or "response ")
      const tagMatch = afterBracket.match(
        /^<(\/?)(response|reference|cite)[\s\n]/i,
      );
      if (tagMatch && !afterBracket.includes(">")) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks if we're in the middle of a closing tag (like </response, </cite, or </ alone from chunked SSE)
 */
export function hasIncompleteClosingTag(content: string): boolean {
  const lastOpenBracket = content.lastIndexOf("<");
  if (lastOpenBracket === -1) return false;

  const afterBracket = content.slice(lastOpenBracket);
  if (!afterBracket.startsWith("</")) return false;
  if (afterBracket.includes(">")) return false;

  const tagName = afterBracket
    .slice(2)
    .replace(/[\s\n]+$/, "")
    .toLowerCase();
  return KNOWN_TAGS.some((t) => t.startsWith(tagName));
}

/**
 * Checks if content has started with <response> tag
 */
export function hasResponseTag(content: string): boolean {
  return /<response>/i.test(content);
}

/**
 * Normalizes bold markdown markers (**text**) in streaming content
 * - If we see **, assume next text is bold until another ** comes
 * - If content ends without closing **, remove the opening ** and treat as normal text
 */
export function normalizeBoldMarkers(content: string): string {
  if (!content.includes("**")) {
    return content;
  }

  let result = "";
  let i = 0;
  let inBold = false;
  let boldStartIndexInResult = -1; // Track position in result string, not original

  while (i < content.length) {
    if (
      content[i] === "*" &&
      i + 1 < content.length &&
      content[i + 1] === "*"
    ) {
      if (inBold) {
        // Closing bold marker found
        result += "**";
        inBold = false;
        boldStartIndexInResult = -1;
        i += 2; // Skip both asterisks
      } else {
        // Opening bold marker found
        inBold = true;
        boldStartIndexInResult = result.length; // Track position in result
        result += "**";
        i += 2; // Skip both asterisks
      }
    } else {
      result += content[i];
      i++;
    }
  }

  // If we're still in bold at the end (unclosed marker), remove the opening **
  if (inBold && boldStartIndexInResult !== -1) {
    // Remove the opening ** from the result
    const beforeBold = result.substring(0, boldStartIndexInResult);
    const afterBold = result.substring(boldStartIndexInResult + 2); // Remove "**"
    return beforeBold + afterBold;
  }

  return result;
}

function extractCitationsFromZone(zone: string, out: number[]): void {
  const citeMatches = zone.matchAll(/<cite>\s*(\d+)\s*<\/cite>/gi);
  for (const match of citeMatches) {
    const n = parseInt(match[1], 10);
    if (!isNaN(n) && !out.includes(n)) out.push(n);
  }
}

/**
 * Parses content to extract response text and citations
 * @param content The content to parse
 * @param isStreaming Whether this is streaming content (more strict parsing) or loaded content (more lenient)
 */
export function parseResponseFormat(
  content: string,
  isStreaming: boolean = true,
): ParsedResponse {
  const result: ParsedResponse = {
    response: "",
    citations: [],
    rawContent: content,
  };

  // Check if we have <response> tag (complete or incomplete)
  // Match <response> with optional whitespace (including newlines)
  // This handles cases where >\n comes as a separate chunk
  // Also handle cases where tag is split: < then response then >
  const responseTagMatch = content.match(/<response[\s\n]*>/i);
  // Also check for incomplete tag that might be building: <response (without >)
  const incompleteResponseTagMatch = content.match(/<response[\s\n]*$/i);

  if (responseTagMatch) {
    // Find the position after <response>
    const afterResponseTag =
      responseTagMatch.index! + responseTagMatch[0].length;
    const contentAfterTag = content.slice(afterResponseTag);

    // Check if we have closing </response> (with optional whitespace/newlines)
    const closingTagMatch = contentAfterTag.match(/<\/response[\s\n]*>/i);
    if (closingTagMatch) {
      // Extract content between <response> and </response>
      const rawResponse = contentAfterTag
        .slice(0, closingTagMatch.index)
        .trim();
      // Normalize bold markers (handle incomplete ** markers)
      result.response = normalizeBoldMarkers(rawResponse);
    } else {
      // No closing tag yet, extract everything after <response>
      // This allows streaming to show content as it arrives
      // But check if we're in the middle of a closing tag - if so, extract up to that point
      const incompleteCloseMatch = contentAfterTag.match(/<\/response/i);
      if (incompleteCloseMatch) {
        // We're in the middle of closing tag, extract content up to that point
        const rawResponse = contentAfterTag
          .slice(0, incompleteCloseMatch.index)
          .trim();
        // Normalize bold markers (handle incomplete ** markers)
        result.response = normalizeBoldMarkers(rawResponse);
      } else {
        const rawResponse = contentAfterTag.trim();
        // Normalize bold markers (handle incomplete ** markers during streaming)
        result.response = normalizeBoldMarkers(rawResponse);
      }
    }
  } else if (incompleteResponseTagMatch) {
    // We have <response but no > yet - might be building the tag
    // Don't extract content yet, wait for complete tag
    result.response = "";
  } else {
    // If no <response> tag found
    if (isStreaming) {
      // During streaming: if content doesn't start with <, treat everything as response
      // Otherwise, we're waiting for <response> tag, so response stays empty
      if (!content.trim().startsWith("<")) {
        // Normalize bold markers for non-tagged content too
        result.response = normalizeBoldMarkers(content);
      }
    } else {
      // When loading from backend: if content doesn't have the format, use it as-is
      // Only return empty if we're clearly waiting for a tag (content starts with < but no response tag)
      const hasAnyTag = /<[^>]+>/i.test(content);
      if (!hasAnyTag || !content.trim().startsWith("<")) {
        // Normalize bold markers
        result.response = normalizeBoldMarkers(content);
      }
      // If content has tags but not <response>, it might be malformed, but we'll still try to use it
      if (!result.response && hasAnyTag) {
        result.response = normalizeBoldMarkers(content);
      }
    }
  }

  // Extract citations from reference tags
  // 1) Complete block: <reference>...</reference>
  const referenceMatch = content.match(
    /<reference[\s\n]*>([\s\S]*?)<\/reference[\s\n]*>/i,
  );
  if (referenceMatch) {
    extractCitationsFromZone(referenceMatch[1], result.citations);
  } else {
    // 2) Streaming: <reference>...<cite>1</cite>... without </reference> yet
    const refOpenMatch = content.match(/<reference[\s\n]*>/i);
    if (refOpenMatch) {
      const zoneStart = refOpenMatch.index! + refOpenMatch[0].length;
      const afterRef = content.slice(zoneStart);
      const refCloseMatch = afterRef.match(/<\/reference[\s\n]*>/i);
      const zone = refCloseMatch
        ? afterRef.slice(0, refCloseMatch.index)
        : afterRef;
      extractCitationsFromZone(zone, result.citations);
    } else {
      // 3) Check for incomplete <reference tag (building, no > yet)
      const incompleteRefMatch = content.match(/<reference[\s\n]*$/i);
      if (incompleteRefMatch) {
        // Tag is still building, don't extract citations yet
        result.citations = [];
      }
    }
  }

  // Also extract inline <cite>N</cite> from the response body so that
  // any cite referenced inline but missing from <reference> still appears in อ้างอิง
  if (result.response) {
    extractCitationsFromZone(result.response, result.citations);
  }

  result.citations.sort((a, b) => a - b);

  // Renumber citations to be sequential (1, 2, 3...) based on order of appearance in response
  if (result.citations.length > 0 && result.response) {
    // Collect cite numbers in order of first appearance in the response
    const appearanceOrder: number[] = [];
    const citeAppearances = result.response.matchAll(
      /<cite>\s*(\d+)\s*<\/cite>/gi,
    );
    for (const m of citeAppearances) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n) && !appearanceOrder.includes(n)) {
        appearanceOrder.push(n);
      }
    }
    // Add any citations from <reference> block that weren't inline
    for (const c of result.citations) {
      if (!appearanceOrder.includes(c)) {
        appearanceOrder.push(c);
      }
    }

    // Build renumber map: original -> sequential
    const renumberMap: Record<number, number> = {};
    appearanceOrder.forEach((orig, idx) => {
      renumberMap[orig] = idx + 1;
    });

    // Replace inline cite numbers in response
    result.response = result.response.replace(
      /<cite>\s*(\d+)\s*<\/cite>/gi,
      (_match, num) => {
        const n = parseInt(num, 10);
        return `<cite>${renumberMap[n] ?? n}</cite>`;
      },
    );

    // Renumber citations array
    result.citations = appearanceOrder.map((_orig, idx) => idx + 1);
    result.citationRenumberMap = renumberMap;
  }

  return result;
}

/**
 * Determines if we should buffer content (not display yet) to avoid showing tag characters
 * This function buffers aggressively to ensure no tag characters are ever displayed
 */
export function shouldBufferContent(content: string): boolean {
  // If content doesn't contain <, no need to buffer
  if (!content.includes("<")) {
    return false;
  }

  // Check if we have a complete <response> opening tag
  // Match <response> with optional whitespace/newlines (handles >\n case)
  const responseOpenTagMatch = content.match(/<response[\s\n]*>/i);

  if (responseOpenTagMatch) {
    // We have the opening <response> tag
    const afterOpenTag = content.slice(
      responseOpenTagMatch.index! + responseOpenTagMatch[0].length,
    );

    // Check if we have a closing </response> tag
    const responseCloseTagMatch = afterOpenTag.match(/<\/response\s*>/i);

    if (responseCloseTagMatch) {
      // We have both opening and closing tags
      // Content between them is safe to show (already extracted by parseResponseFormat)
      // But check if there's content after </response> that might be tags
      const afterCloseTag = afterOpenTag.slice(
        responseCloseTagMatch.index! + responseCloseTagMatch[0].length,
      );

      // If there's content after </response>, check if it's <reference> or incomplete ref/cite tags
      if (afterCloseTag.trim()) {
        const trimmedAfter = afterCloseTag.trim();
        const incomplete =
          hasIncompleteTag(afterCloseTag) ||
          hasIncompleteClosingTag(afterCloseTag);
        const inRefSection =
          trimmedAfter.startsWith("<reference") ||
          trimmedAfter.startsWith("</reference") ||
          trimmedAfter.startsWith("<cite") ||
          trimmedAfter.startsWith("</cite") ||
          incomplete;
        if (inRefSection) {
          return incomplete;
        }
        return false;
      }

      // No content after </response>, we're done - can show extracted content
      return false;
    } else {
      // We have opening tag but no closing tag yet
      // Check if we're in the middle of typing the closing tag
      if (hasIncompleteClosingTag(afterOpenTag)) {
        return true; // Buffer while closing tag is incomplete
      }
      // We're past the opening tag and not in a closing tag, content is safe to show
      return false;
    }
  }

  // If we see < but don't have complete <response> opening tag yet, buffer
  // This handles cases like:
  // - "<" (just started)
  // - "<r" (incomplete)
  // - "<response" (incomplete opening tag, missing >)
  // - "<response\n" (tag name with newline but no > yet)
  // - "<response " (tag name with space but no > yet)
  const hasResponseStart = /<response/i.test(content);
  if (hasResponseStart) {
    // Check if we have a complete opening tag (with >, possibly followed by newline)
    // This handles the case where >\n comes as a separate chunk
    const completeTagMatch = content.match(/<response[\s\n]*>/i);
    if (!completeTagMatch) {
      // We're in the middle of <response> tag, buffer until complete
      return hasIncompleteTag(content);
    }
  }

  // If we have < but it's not <response> yet, buffer
  // We want to be safe and buffer until we know what it is
  // This prevents showing "<" or "<r" etc. before we know it's a tag
  return true;
}
