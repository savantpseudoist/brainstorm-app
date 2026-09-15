import type { ChatMessage } from '@shared/types'

// At or above this many words, the transcript is split into chunks and fed in
// sequentially instead of as one prompt.
export const RECOVERY_WORD_THRESHOLD = 5000

// Word budget per chunk in the chunked path.
export const RECOVERY_CHUNK_WORDS = 1500

// Exact footers appended to chunks (Scenario B). Kept verbatim per spec.
export const CONTINUE_FOOTER =
  '---\nhold on dont say anything theres more, just acknowledge by saying "waiting".'
export const FINAL_FOOTER = '---\nthats the last of it.'

export function wordCount(text: string): number {
  const t = text.trim()
  return t ? t.split(/\s+/).length : 0
}

// Renders the saved transcript into the recovery template:
// "I just lost a chat with you, here is context: I said '…', you replied '…', …"
export function buildRecoveryTranscript(messages: ChatMessage[]): string {
  const hasBookmarks = messages.some((m) => m.bookmarked)
  const targetMessages = hasBookmarks ? messages.filter((m) => m.bookmarked) : messages
  const intro = hasBookmarks
    ? 'I just lost a chat with you, here is key bookmarked context from our conversation:'
    : 'I just lost a chat with you, here is context:'
  const parts = targetMessages.map((m) =>
    m.role === 'user'
      ? `I said '${m.content.trim()}'`
      : `you replied '${m.content.trim()}'`
  )
  return `${intro} ${parts.join(', ')}.`
}

/**
 * Turns a session's transcript into the ordered list of prompts to send.
 *
 * - Scenario A (< 5000 words): a single prompt, no footer.
 * - Scenario B (>= 5000 words): word-budgeted chunks; every chunk but the last
 *   gets the "waiting" footer, the last gets the "thats the last of it" footer.
 *
 * Only the messages passed in are used, so recovering one session never pulls in
 * another conversation's context.
 */
export function buildRecoveryChunks(messages: ChatMessage[]): string[] {
  const transcript = buildRecoveryTranscript(messages)
  if (wordCount(transcript) < RECOVERY_WORD_THRESHOLD) {
    return [transcript]
  }

  const words = transcript.split(/\s+/)
  const raw: string[] = []
  for (let i = 0; i < words.length; i += RECOVERY_CHUNK_WORDS) {
    raw.push(words.slice(i, i + RECOVERY_CHUNK_WORDS).join(' '))
  }
  return raw.map((chunk, i) =>
    i === raw.length - 1 ? `${chunk}\n${FINAL_FOOTER}` : `${chunk}\n${CONTINUE_FOOTER}`
  )
}
