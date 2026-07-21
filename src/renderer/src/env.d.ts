/// <reference types="vite/client" />

import type { DetailedHTMLProps, HTMLAttributes } from 'react'

// Minimal typing for Electron's <webview> tag so TSX/ESLint accept it.
declare global {
  namespace JSX {
    interface IntrinsicElements {
      webview: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string
        partition?: string
        preload?: string
        allowpopups?: boolean
        webpreferences?: string
      }
    }
  }
}

export {}
