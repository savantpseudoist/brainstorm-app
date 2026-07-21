import { ipcRenderer } from 'electron'
import type { CodeBlock, InboundPayload } from '@shared/types'

// DOM Selectors for ChatGPT interface (current as of 2024-2025)
// Multiple fallback selectors for each element type
const SELECTORS = {
  // Input area - contenteditable div (try multiple selectors)
  input: [
    '#prompt-textarea',
    'div[contenteditable="true"][data-slate-editor]',
    'div[contenteditable="true"]',
    'textarea',
    'form textarea'
  ],
  // Send button
  sendButton: [
    'button[data-testid="send-button"]',
    'button[aria-label="Send prompt"]',
    'button:has(svg)',
    'form button[type="submit"]',
    'button[aria-label]'
  ],
  // New chat button
  newChatButton: [
    '[data-testid="new-chat-button"]',
    'a[href="/"]',
    'button:contains("New chat")',
    'button[aria-label*="new" i]'
  ],
  // Assistant messages container
  assistantMessage: '[data-message-author-role="assistant"]',
  // Code blocks within messages
  codeBlock: 'pre code',
  // Language class pattern
  languageClassPattern: /language-(\w+)/
} as const

// Helper to try multiple selectors and return the first match
function querySelectorWithFallback(selectors: string | string[]): Element | null {
  const selectorList = Array.isArray(selectors) ? selectors : [selectors]

  for (const selector of selectorList) {
    try {
      const el = document.querySelector(selector)
      if (el) {
        console.log(`[ChatGPT Bridge] Found element with selector: ${selector}`)
        return el
      }
    } catch (e) {
      console.warn(`[ChatGPT Bridge] Invalid selector: ${selector}`, e)
    }
  }

  console.warn(`[ChatGPT Bridge] No element found for any selector:`, selectorList)
  return null
}

/**
 * Find element with retry logic for dynamic content
 */
async function findElement(
  selector: string | readonly string[],
  timeout = 5000
): Promise<Element | null> {
  const startTime = Date.now()
  while (Date.now() - startTime < timeout) {
    const el = querySelectorWithFallback(selector as string | string[])
    if (el) return el
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  return null
}

/**
 * Fill contenteditable input with proper React state triggering
 */
async function fillContenteditableInput(text: string): Promise<boolean> {
  console.log('[ChatGPT Bridge] fillContenteditableInput called, looking for input with selector:', SELECTORS.input)

  const input = await findElement(SELECTORS.input as unknown as string) as HTMLElement
  if (!input) {
    console.error('[ChatGPT Bridge] Input element not found with selector:', SELECTORS.input)
    // Log available elements for debugging
    const allInputs = document.querySelectorAll('div[contenteditable]')
    console.log('[ChatGPT Bridge] Available contenteditable elements:', allInputs.length)
    allInputs.forEach((el, i) => {
      console.log(`[ChatGPT Bridge]   [${i}]`, el.tagName, el.className, el.id)
    })
    return false
  }

  console.log('[ChatGPT Bridge] Found input element:', input.tagName, input.className)

  // Focus the element
  input.focus()
  console.log('[ChatGPT Bridge] Focused input')

  // Clear existing content
  input.textContent = ''
  input.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }))
  console.log('[ChatGPT Bridge] Cleared input content')

  // Use execCommand to insert text - this properly triggers React's onChange
  console.log('[ChatGPT Bridge] Attempting execCommand insertText...')
  const success = document.execCommand('insertText', false, text)
  console.log('[ChatGPT Bridge] execCommand result:', success)

  if (!success) {
    // Fallback: directly set textContent and dispatch events
    console.log('[ChatGPT Bridge] Falling back to textContent')
    input.textContent = text
  }

  // Dispatch comprehensive event sequence to trigger React state updates
  console.log('[ChatGPT Bridge] Dispatching events...')
  const events = [
    new InputEvent('input', { bubbles: true, cancelable: true, data: text }),
    new Event('input', { bubbles: true, cancelable: true }),
    new Event('change', { bubbles: true, cancelable: true }),
    new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: 'v', ctrlKey: true })
  ]

  events.forEach(event => input.dispatchEvent(event))

  // Trigger a focus event again to ensure state updates
  input.focus()
  console.log('[ChatGPT Bridge] fillContenteditableInput completed successfully')

  return true
}

/**
 * Click the send button
 */
async function clickSendButton(): Promise<boolean> {
  const sendButton = await findElement(SELECTORS.sendButton) as HTMLButtonElement
  if (!sendButton) {
    console.error('[ChatGPT Bridge] Send button not found')
    return false
  }

  // Ensure button is enabled
  if (sendButton.disabled) {
    console.error('[ChatGPT Bridge] Send button is disabled')
    return false
  }

  // Click the button
  sendButton.click()

  // Also dispatch mousedown/mouseup/click events for completeness
  const rect = sendButton.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2

  sendButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: x, clientY: y }))
  sendButton.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: x, clientY: y }))
  sendButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y }))

  return true
}

/**
 * Click the new chat button
 */
async function clickNewChatButton(): Promise<boolean> {
  const newChatBtn = await findElement(SELECTORS.newChatButton) as HTMLElement
  if (!newChatBtn) {
    console.error('[ChatGPT Bridge] New chat button not found')
    return false
  }

  newChatBtn.click()
  return true
}

/**
 * Fill input and submit with delay
 */
async function fillAndSubmit(text: string, delayMs = 500): Promise<boolean> {
  console.log('[ChatGPT Bridge] fillAndSubmit called with text length:', text.length)

  try {
    console.log('[ChatGPT Bridge] Calling fillContenteditableInput...')
    const fillSuccess = await fillContenteditableInput(text)
    console.log('[ChatGPT Bridge] fillContenteditableInput returned:', fillSuccess)

    if (!fillSuccess) {
      console.error('[ChatGPT Bridge] fillContenteditableInput failed')
      return false
    }

    // Wait for React state to update and button to become enabled
    console.log('[ChatGPT Bridge] Waiting', delayMs, 'ms for React state update...')
    await new Promise(resolve => setTimeout(resolve, delayMs))

    console.log('[ChatGPT Bridge] Calling clickSendButton...')
    const clickSuccess = await clickSendButton()
    console.log('[ChatGPT Bridge] clickSendButton returned:', clickSuccess)

    return clickSuccess
  } catch (err) {
    console.error('[ChatGPT Bridge] fillAndSubmit caught error:', err)
    return false
  }
}

/**
 * Parse code blocks from an element
 */
function parseCodeBlocks(element: Element): CodeBlock[] {
  const blocks: CodeBlock[] = []
  const codeElements = element.querySelectorAll(SELECTORS.codeBlock)

  codeElements.forEach((codeEl) => {
    const className = codeEl.className || ''
    const match = className.match(SELECTORS.languageClassPattern)
    const language = match ? match[1] : 'plaintext'
    const code = codeEl.textContent || ''
    blocks.push({ language, code })
  })

  return blocks
}

// --- Reply capture ---------------------------------------------------------
//
// We only capture an assistant reply after a prompt has been submitted, and
// only once its text has stopped changing (settled). This fixes two problems:
//   1. Emitting an empty/partial bubble while the reply is still streaming.
//   2. Re-emitting old messages when an existing conversation is reloaded
//      (reloads don't arm capture, so nothing fires).
let awaitingReply = false
let baselineAssistantCount = 0
let lastSeenText = ''
let settleTimer: ReturnType<typeof setTimeout> | null = null

function assistantMessages(): NodeListOf<Element> {
  return document.querySelectorAll(SELECTORS.assistantMessage)
}

// Called right after a successful submit: remember how many assistant messages
// already exist so we only capture the new one.
function armReplyCapture(): void {
  awaitingReply = true
  baselineAssistantCount = assistantMessages().length
  lastSeenText = ''
  if (settleTimer) {
    clearTimeout(settleTimer)
    settleTimer = null
  }
}

function emitSettledReply(): void {
  const messages = assistantMessages()
  if (messages.length <= baselineAssistantCount) return
  const el = messages[messages.length - 1]
  const text = (el.textContent || '').trim()
  if (!text) return

  const payload: InboundPayload = {
    text,
    codeBlocks: parseCodeBlocks(el),
    timestamp: Date.now()
  }
  ipcRenderer.sendToHost('dom-bridge:message', payload)
  awaitingReply = false
}

function onPossibleReplyChange(): void {
  if (!awaitingReply) return
  const messages = assistantMessages()
  if (messages.length <= baselineAssistantCount) return
  const el = messages[messages.length - 1]
  const text = el.textContent || ''
  if (text === lastSeenText) return

  // Text is still growing — reset the settle timer. When it stops growing for a
  // beat, streaming is done and we emit the final content exactly once.
  lastSeenText = text
  if (settleTimer) clearTimeout(settleTimer)
  settleTimer = setTimeout(emitSettledReply, 1200)
}

/**
 * Set up a MutationObserver that drives settle-based reply capture.
 */
function startMessageObserver(): void {
  const observer = new MutationObserver(() => onPossibleReplyChange())
  observer.observe(document.body, { childList: true, subtree: true, characterData: true })
}

// --- Conversation URL tracking --------------------------------------------
//
// ChatGPT is a single-page app: each conversation has its own /c/<id> URL that
// the host stores per session, so a session can be reopened and continued. We
// poll because SPA navigations don't fire a page load.
let lastReportedUrl = ''
function reportUrl(): void {
  const href = location.href
  if (href !== lastReportedUrl) {
    lastReportedUrl = href
    ipcRenderer.sendToHost('dom-bridge:url', href)
  }
}

// --- IPC Operation Handlers ---

interface OperationPayload {
  type: 'fillInput' | 'clickElement' | 'fillAndSubmit'
  selector?: string
  text?: string
  delayMs?: number
}

async function handleOperation(_event: Electron.IpcRendererEvent, payload: string): Promise<void> {
  console.log('[ChatGPT Bridge] Received operation:', payload)
  try {
    const operation: OperationPayload = JSON.parse(payload)
    let success = false
    let errorMessage = ''
    console.log('[ChatGPT Bridge] Parsed operation:', operation.type)

    switch (operation.type) {
      case 'fillInput':
        if (operation.text) {
          try {
            success = await fillContenteditableInput(operation.text)
            if (!success) errorMessage = 'fillContenteditableInput returned false'
          } catch (e) {
            errorMessage = e instanceof Error ? e.message : String(e)
          }
        } else {
          errorMessage = 'No text provided for fillInput'
        }
        break
      case 'clickElement':
        try {
          if (operation.selector === '[data-testid="new-chat-button"]') {
            success = await clickNewChatButton()
            if (!success) errorMessage = 'clickNewChatButton returned false'
          } else if (operation.selector === 'button[data-testid="send-button"]') {
            success = await clickSendButton()
            if (!success) errorMessage = 'clickSendButton returned false'
          } else {
            const el = document.querySelector(operation.selector || '') as HTMLElement
            if (el) {
              el.click()
              success = true
            } else {
              errorMessage = `Element not found: ${operation.selector}`
            }
          }
        } catch (e) {
          errorMessage = e instanceof Error ? e.message : String(e)
        }
        break
      case 'fillAndSubmit':
        if (operation.text) {
          try {
            success = await fillAndSubmit(operation.text, operation.delayMs || 500)
            if (success) armReplyCapture()
            if (!success) errorMessage = 'fillAndSubmit returned false'
          } catch (e) {
            errorMessage = e instanceof Error ? e.message : String(e)
          }
        } else {
          errorMessage = 'No text provided for fillAndSubmit'
        }
        break
      default:
        errorMessage = `Unknown operation type: ${(operation as {type: string}).type}`
    }

    if (!success) {
      console.error('[ChatGPT Bridge] Operation failed:', errorMessage)
      ipcRenderer.sendToHost('dom-bridge:error', {
        operation: operation.type,
        message: errorMessage || `Failed to execute ${operation.type}`
      })
    }
  } catch (err) {
    console.error('[ChatGPT Bridge] Operation error:', err)
    ipcRenderer.sendToHost('dom-bridge:error', {
      message: err instanceof Error ? err.message : String(err)
    })
  }
}

// Listen for operations from the renderer
ipcRenderer.on('dom-bridge:op', handleOperation)

// Also listen for ping to verify connection
ipcRenderer.on('dom-bridge:ping', () => {
  console.log('[ChatGPT Bridge] Received ping, sending pong')
  ipcRenderer.sendToHost('dom-bridge:pong', {})
})

// Start observing for messages when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startMessageObserver)
} else {
  startMessageObserver()
}

// Report the current conversation URL to the host, then keep watching for SPA
// navigations (new chat, switching conversations).
reportUrl()
setInterval(reportUrl, 1500)

// Signal to the renderer that the preload is ready
console.log('[ChatGPT Bridge] Preload script loaded, sending ready signal')
ipcRenderer.sendToHost('dom-bridge:ready', {})

// Export for potential external use
export {
  fillContenteditableInput,
  clickSendButton,
  clickNewChatButton,
  fillAndSubmit
}
