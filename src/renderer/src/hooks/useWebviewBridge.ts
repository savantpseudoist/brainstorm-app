import { useCallback, useEffect, useRef, useState } from 'react'
import type { DomBridgeConfig, InboundPayload } from '@shared/types'

// Loosely typed webview element interface for renderer execution without ambient Node types
export type WebviewElement = HTMLElement & {
  send: (channel: string, ...args: unknown[]) => void
  reload: () => void
  loadURL: (url: string) => Promise<void>
  getURL: () => string
}

export interface UseWebviewBridgeResult {
  webviewRef: React.RefCallback<WebviewElement | null>
  isReady: boolean
  sendOperation: (payload: string) => void
  onMessage: (callback: (data: InboundPayload) => void) => () => void
  onUrl: (callback: (url: string) => void) => () => void
  onAddToNotes: (callback: (text: string) => void) => () => void
  onSaveAsIdea: (callback: (text: string) => void) => () => void
  navigateTo: (url: string) => void
  navigateAndWait: (url: string, timeoutMs?: number) => Promise<void>
}

export interface BridgeOperation {
  type: 'fillInput' | 'clickElement' | 'fillAndSubmit'
  selector?: string
  text?: string
  delayMs?: number
}

/**
 * Custom React hook wrapping Electron <webview> IPC interaction.
 * Provides typed outbound operation dispatching and inbound message observation.
 */
export function useWebviewBridge(_config?: DomBridgeConfig): UseWebviewBridgeResult {
  // Use state instead of ref to trigger re-renders when webview is attached
  const [webviewNode, setWebviewNode] = useState<WebviewElement | null>(null)
  const [isReady, setIsReady] = useState(false)
  const messageListenersRef = useRef<Set<(data: InboundPayload) => void>>(new Set())
  const urlListenersRef = useRef<Set<(url: string) => void>>(new Set())
  const addToNotesListenersRef = useRef<Set<(text: string) => void>>(new Set())
  const saveAsIdeaListenersRef = useRef<Set<(text: string) => void>>(new Set())

  // Ref callback to capture <webview> DOM element attachment
  const webviewRef = useCallback((node: WebviewElement | null) => {
    console.log('[useWebviewBridge] webviewRef callback called with node:', node)
    if (node) {
      // Check if webview is already ready (isReady() method exists on webview element)
      try {
        // @ts-expect-error - isReady exists on webview
        const alreadyReady = typeof node.isReady === 'function' ? node.isReady() : false
        if (alreadyReady) {
          console.log('[useWebviewBridge] Webview is already ready, setting isReady to true')
          setIsReady(true)
        }
      } catch (e) {
        console.warn('[useWebviewBridge] Error checking isReady:', e)
      }
    }
    setWebviewNode(node)
  }, [])

  // Event handler processing `ipc-message` host events emitted by webview `ipcRenderer.sendToHost()`
  useEffect(() => {
    if (!webviewNode) {
      console.log('[useWebviewBridge] No webview node yet, skipping event listener setup')
      return
    }

    console.log('[useWebviewBridge] Setting up event listeners on webview')

    // Reset isReady when webview changes
    setIsReady(false)

    const handleDomReady = (): void => {
      console.log('[useWebviewBridge] Webview dom-ready fired')
      setIsReady(true)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleIpcMessage = (event: any): void => {
      console.log('[useWebviewBridge] Received ipc-message:', event.channel, event.args)
      if (event.channel === 'dom-bridge:message') {
        const payload: InboundPayload = event.args[0]
        messageListenersRef.current.forEach((cb) => cb(payload))
      } else if (event.channel === 'dom-bridge:url') {
        const url: string = event.args[0]
        urlListenersRef.current.forEach((cb) => cb(url))
      } else if (event.channel === 'dom-bridge:add-to-notes') {
        const text: string = event.args[0]
        addToNotesListenersRef.current.forEach((cb) => cb(text))
      } else if (event.channel === 'dom-bridge:save-as-idea') {
        const text: string = event.args[0]
        saveAsIdeaListenersRef.current.forEach((cb) => cb(text))
      } else if (event.channel === 'dom-bridge:error') {
        console.warn('[useWebviewBridge] Received error from webview bridge:', event.args[0])
      }
    }

    webviewNode.addEventListener('dom-ready', handleDomReady)
    webviewNode.addEventListener('ipc-message', handleIpcMessage)

    return () => {
      console.log('[useWebviewBridge] Cleaning up event listeners')
      webviewNode.removeEventListener('dom-ready', handleDomReady)
      webviewNode.removeEventListener('ipc-message', handleIpcMessage)
    }
  }, [webviewNode])

  /**
   * Transmits outbound command payload to guest webview via webview.send()
   * Falls back to executeJavaScript if send() fails (electron quirk)
   */
  const sendOperation = useCallback((payload: string): void => {
    if (!isReady) {
      console.warn('[useWebviewBridge] Cannot send operation: webview not ready yet.')
      return
    }
    if (!webviewNode) {
      console.warn('[useWebviewBridge] Cannot send operation: webview ref not attached.')
      return
    }

    console.log('[useWebviewBridge] Attempting to send operation:', payload)

    // Method 1: Try webview.send() - this works in some Electron versions
    try {
      webviewNode.send('dom-bridge:op', payload)
      console.log('[useWebviewBridge] Sent via webview.send()')
      return
    } catch (err) {
      console.warn('[useWebviewBridge] webview.send() failed:', err)
    }

    // Method 2: Try executeJavaScript to trigger IPC from within webview context
    try {
      // @ts-expect-error - executeJavaScript exists on webview element
      webviewNode.executeJavaScript(`
        if (typeof require !== 'undefined') {
          const { ipcRenderer } = require('electron');
          ipcRenderer.emit('dom-bridge:op', null, '${payload.replace(/'/g, "\\'")}');
        }
      `)
      console.log('[useWebviewBridge] Sent via executeJavaScript')
    } catch (err) {
      console.error('[useWebviewBridge] All send methods failed:', err)
    }
  }, [isReady, webviewNode])

  /**
   * Registers callback for inbound DOM observation payloads emitted by guest webview
   */
  const onMessage = useCallback((callback: (data: InboundPayload) => void): (() => void) => {
    messageListenersRef.current.add(callback)
    return () => {
      messageListenersRef.current.delete(callback)
    }
  }, [])

  /**
   * Registers a callback fired when the guest webview's conversation URL changes.
   */
  const onUrl = useCallback((callback: (url: string) => void): (() => void) => {
    urlListenersRef.current.add(callback)
    return () => {
      urlListenersRef.current.delete(callback)
    }
  }, [])

  const onAddToNotes = useCallback((callback: (text: string) => void): (() => void) => {
    addToNotesListenersRef.current.add(callback)
    return () => {
      addToNotesListenersRef.current.delete(callback)
    }
  }, [])

  const onSaveAsIdea = useCallback((callback: (text: string) => void): (() => void) => {
    saveAsIdeaListenersRef.current.add(callback)
    return () => {
      saveAsIdeaListenersRef.current.delete(callback)
    }
  }, [])

  /**
   * Navigates the guest webview to a specific conversation URL (used to reopen a
   * saved session). No-op if we're already there.
   */
  const navigateTo = useCallback(
    (url: string): void => {
      if (!webviewNode) return
      try {
        if (webviewNode.getURL() === url) return
        webviewNode.loadURL(url)
      } catch (err) {
        console.warn('[useWebviewBridge] navigateTo failed:', err)
      }
    },
    [webviewNode]
  )

  /**
   * Navigates the guest webview and resolves once the new page's DOM is ready
   * (or after a timeout). Used to open a fresh chat before injecting context.
   */
  const navigateAndWait = useCallback(
    (url: string, timeoutMs = 20000): Promise<void> =>
      new Promise((resolve) => {
        if (!webviewNode) {
          resolve()
          return
        }
        let done = false
        const finish = (): void => {
          if (done) return
          done = true
          webviewNode.removeEventListener('dom-ready', onReady)
          resolve()
        }
        const onReady = (): void => finish()
        webviewNode.addEventListener('dom-ready', onReady)
        try {
          webviewNode.loadURL(url)
        } catch (err) {
          console.warn('[useWebviewBridge] navigateAndWait loadURL failed:', err)
          finish()
        }
        window.setTimeout(finish, timeoutMs)
      }),
    [webviewNode]
  )

  return {
    webviewRef,
    isReady,
    sendOperation,
    onMessage,
    onUrl,
    onAddToNotes,
    onSaveAsIdea,
    navigateTo,
    navigateAndWait
  }
}
