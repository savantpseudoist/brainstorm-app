import type { AIAction } from '@shared/types'

const MARKDOWN_SUFFIX = '\n\nPlease format your response in clear, structured Markdown (use headings `##`, bullet points `-`, bold text `**term**`, and blockquotes `>`).'

const ACTION_TEXT: Record<AIAction, string> = {
  brainstorm:
    'Brainstorm a wide range of fresh, distinct ideas on this topic. Give me a numbered or bulleted list, favouring variety and unexpected angles over polish.' + MARKDOWN_SUFFIX,
  expand:
    'Take the notes below and expand on the most promising directions. For each, add concrete detail, next steps, and one risk to watch.' + MARKDOWN_SUFFIX,
  critique:
    'Play devil\'s advocate on the notes below. Point out weak assumptions, gaps, and failure modes, then suggest how to address each.' + MARKDOWN_SUFFIX,
  ask: 'Here are my brainstorming notes so far.' + MARKDOWN_SUFFIX
}

// Prompts for the notes context menu, operating on a highlighted selection.
export function buildSelectionPrompt(action: 'critique' | 'expand', text: string): string {
  const selection = text.trim()
  if (action === 'expand') {
    return `Expand on the following idea — add concrete detail, next steps, and one risk to watch:\n\n"${selection}"` + MARKDOWN_SUFFIX
  }
  return `Play devil's advocate on the following idea. Point out weak assumptions, gaps, and failure modes, then suggest how to address each:\n\n"${selection}"` + MARKDOWN_SUFFIX
}

/**
 * Assemble a brainstorming prompt from the session's topic and current notes.
 * Pure text assembly — nothing is transmitted here; the caller sends it to the
 * ChatGPT panel (or copies it to the clipboard).
 */
export function buildBrainstormPrompt(opts: {
  topic: string
  notes: string
  action: AIAction
}): string {
  const { topic, notes, action } = opts
  const parts: string[] = []

  if (topic.trim()) {
    parts.push(`Topic: ${topic.trim()}`)
    parts.push('')
  }

  const trimmedNotes = notes.replace(/\r\n/g, '\n').trim()
  if (trimmedNotes) {
    parts.push('My notes so far:')
    parts.push('')
    parts.push(trimmedNotes)
    parts.push('')
  }

  parts.push(`Request: ${ACTION_TEXT[action]}`)
  return parts.join('\n')
}
