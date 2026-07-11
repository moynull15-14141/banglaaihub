// Hand-rolled readability analysis — no readability/text-statistics library
// exists in either package (confirmed by grep before writing this), and this
// phase's SEO score must be real, computed checks, never a fake number. The
// syllable counter and passive-voice detector are documented, standard
// approximations (the same class of heuristic most SEO tools actually use),
// not NLP-grade — good enough for "write shorter sentences" style guidance,
// not a linguistic ground truth.

export interface TextStats {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  headingCount: number;
  listCount: number;
  avgWordsPerSentence: number;
  avgWordsPerParagraph: number;
  fleschScore: number;
  readingDifficulty: 'Very Easy' | 'Easy' | 'Fairly Easy' | 'Standard' | 'Fairly Difficult' | 'Difficult' | 'Very Difficult';
  passiveVoiceSentenceCount: number;
  internalLinkCount: number;
  externalLinkCount: number;
  imagesMissingAlt: number;
  imageCount: number;
}

// Strips HTML tags to plain text — good enough for word/sentence counting;
// not used anywhere unsanitized content would matter (this module never
// renders its input, only counts it).
function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function countSyllables(word: string): number {
  const normalized = word.toLowerCase().replace(/[^a-z]/g, '');
  if (normalized.length === 0) return 0;
  if (normalized.length <= 3) return 1;
  // Standard "count vowel groups, drop silent trailing e" heuristic.
  const stripped = normalized.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  const matches = stripped.match(/[aeiouy]{1,2}/g);
  return matches ? Math.max(1, matches.length) : 1;
}

function fleschDifficulty(score: number): TextStats['readingDifficulty'] {
  if (score >= 90) return 'Very Easy';
  if (score >= 80) return 'Easy';
  if (score >= 70) return 'Fairly Easy';
  if (score >= 60) return 'Standard';
  if (score >= 50) return 'Fairly Difficult';
  if (score >= 30) return 'Difficult';
  return 'Very Difficult';
}

// A sentence is flagged as passive-voice-ish when a to-be verb is
// immediately followed by a past-participle-shaped word (ends "-ed" or is in
// a small common-irregular list). Deliberately approximate — real passive
// detection needs a POS tagger, which isn't installed and would be a heavy
// dependency for one checklist item.
const TO_BE = /\b(is|are|was|were|be|been|being)\b/i;
const IRREGULAR_PARTICIPLES = new Set([
  'done', 'made', 'given', 'taken', 'written', 'seen', 'known', 'shown', 'sent', 'built', 'brought', 'held',
]);

function isPassiveSentence(sentence: string): boolean {
  const words = sentence.trim().split(/\s+/);
  for (let i = 0; i < words.length - 1; i += 1) {
    if (TO_BE.test(words[i]) && (/\w+ed$/i.test(words[i + 1]) || IRREGULAR_PARTICIPLES.has(words[i + 1].toLowerCase()))) {
      return true;
    }
  }
  return false;
}

export function analyzeReadability(bodyHtml: string, siteOrigin: string): TextStats {
  const plainText = stripTags(bodyHtml);
  const words = plainText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const sentences = plainText.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  const sentenceCount = Math.max(1, sentences.length);

  const paragraphMatches = bodyHtml.match(/<p[^>]*>[\s\S]*?<\/p>/gi) ?? [];
  const paragraphCount = Math.max(1, paragraphMatches.length);

  const headingCount = (bodyHtml.match(/<h[2-6][^>]*>/gi) ?? []).length;
  const listCount = (bodyHtml.match(/<(ul|ol)[^>]*>/gi) ?? []).length;

  const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  const fleschScoreRaw =
    wordCount === 0
      ? 0
      : 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (totalSyllables / wordCount);
  const fleschScore = Math.max(0, Math.min(100, Math.round(fleschScoreRaw)));

  const passiveVoiceSentenceCount = sentences.filter(isPassiveSentence).length;

  const linkHrefs = Array.from(bodyHtml.matchAll(/<a\s[^>]*href=["']([^"']+)["'][^>]*>/gi)).map((m) => m[1]);
  const internalLinkCount = linkHrefs.filter(
    (href) => href.startsWith('/') || (siteOrigin && href.startsWith(siteOrigin)),
  ).length;
  const externalLinkCount = linkHrefs.length - internalLinkCount;

  const imgTags = Array.from(bodyHtml.matchAll(/<img\s[^>]*>/gi)).map((m) => m[0]);
  const imageCount = imgTags.length;
  const imagesMissingAlt = imgTags.filter((tag) => !/alt=["'][^"']+["']/i.test(tag)).length;

  return {
    wordCount,
    sentenceCount,
    paragraphCount,
    headingCount,
    listCount,
    avgWordsPerSentence: Math.round((wordCount / sentenceCount) * 10) / 10,
    avgWordsPerParagraph: Math.round((wordCount / paragraphCount) * 10) / 10,
    fleschScore,
    readingDifficulty: fleschDifficulty(fleschScore),
    passiveVoiceSentenceCount,
    internalLinkCount,
    externalLinkCount,
    imagesMissingAlt,
    imageCount,
  };
}
