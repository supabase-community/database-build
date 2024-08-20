'use client'

/**
 * Copied from supabase/supabase ui package.
 *
 * TODO: Redesign this component
 */

import { Copy } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Children, type ReactNode, useState } from 'react'
import { Light as SyntaxHighlighter, type SyntaxHighlighterProps } from 'react-syntax-highlighter'

import curl from 'highlightjs-curl'
import bash from 'react-syntax-highlighter/dist/cjs/languages/hljs/bash'
import csharp from 'react-syntax-highlighter/dist/cjs/languages/hljs/csharp'
import dart from 'react-syntax-highlighter/dist/cjs/languages/hljs/dart'
import http from 'react-syntax-highlighter/dist/cjs/languages/hljs/http'
import js from 'react-syntax-highlighter/dist/cjs/languages/hljs/javascript'
import json from 'react-syntax-highlighter/dist/cjs/languages/hljs/json'
import kotlin from 'react-syntax-highlighter/dist/cjs/languages/hljs/kotlin'
import py from 'react-syntax-highlighter/dist/cjs/languages/hljs/python'
import sql from 'react-syntax-highlighter/dist/cjs/languages/hljs/sql'
import ts from 'react-syntax-highlighter/dist/cjs/languages/hljs/typescript'

import { cn } from '~/lib/utils'
import { Button } from './ui/button'

export interface CodeBlockProps {
  title?: ReactNode
  language?:
    | 'js'
    | 'jsx'
    | 'sql'
    | 'py'
    | 'bash'
    | 'ts'
    | 'dart'
    | 'json'
    | 'csharp'
    | 'kotlin'
    | 'curl'
    | 'http'
  linesToHighlight?: number[]
  hideCopy?: boolean
  hideLineNumbers?: boolean
  className?: string
  value?: string
  children?: string | string[]
  renderer?: SyntaxHighlighterProps['renderer']
  theme?: 'auto' | 'light' | 'dark'
}

export const CodeBlock = ({
  title,
  language,
  linesToHighlight = [],
  className,
  value,
  children,
  hideCopy = false,
  hideLineNumbers = false,
  renderer,
  theme = 'auto',
}: CodeBlockProps) => {
  const { resolvedTheme } = useTheme()
  const isDarkTheme = theme === 'auto' ? resolvedTheme?.includes('dark')! : theme === 'dark'
  const monokaiTheme = monokaiCustomTheme(isDarkTheme)

  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    setCopied(true)
    navigator.clipboard.writeText(value ?? '')
    setTimeout(() => {
      setCopied(false)
    }, 2000)
  }

  // Extract string when `children` has a single string node
  const childrenArray = Children.toArray(children)
  const [singleChild] = childrenArray.length === 1 ? childrenArray : []
  const singleString = typeof singleChild === 'string' ? singleChild : undefined

  let codeValue =
    value ??
    (typeof children === 'string'
      ? children
      : Array.isArray(children)
        ? children.join('')
        : undefined)
  codeValue = codeValue?.trimEnd?.() ?? codeValue

  // check the length of the string inside the <code> tag
  // if it's fewer than 70 characters, add a white-space: pre so it doesn't wrap
  const shortCodeBlockClasses =
    typeof codeValue === 'string' && codeValue.length < 70 ? 'short-inline-codeblock' : ''

  let lang = language ? language : className ? className.replace('language-', '') : 'js'
  // force jsx to be js highlighted
  if (lang === 'jsx') lang = 'js'
  SyntaxHighlighter.registerLanguage('js', js)
  SyntaxHighlighter.registerLanguage('ts', ts)
  SyntaxHighlighter.registerLanguage('py', py)
  SyntaxHighlighter.registerLanguage('sql', sql)
  SyntaxHighlighter.registerLanguage('bash', bash)
  SyntaxHighlighter.registerLanguage('dart', dart)
  SyntaxHighlighter.registerLanguage('csharp', csharp)
  SyntaxHighlighter.registerLanguage('json', json)
  SyntaxHighlighter.registerLanguage('kotlin', kotlin)
  SyntaxHighlighter.registerLanguage('curl', curl)
  SyntaxHighlighter.registerLanguage('http', http)

  const large = false
  // don't show line numbers if bash == lang
  if (lang === 'bash' || lang === 'sh') hideLineNumbers = true
  const showLineNumbers = !hideLineNumbers

  return (
    <>
      {title && (
        <div className="text-sm rounded-t-md bg-surface-100 py-2 px-4 border border-b-0 border-default font-sans">
          {title}
        </div>
      )}
      {className ? (
        <div className="group relative max-w-[90vw] md:max-w-none overflow-auto">
          {/* @ts-ignore */}
          <SyntaxHighlighter
            language={lang}
            wrapLines={true}
            // @ts-ignore
            style={monokaiTheme}
            className={cn(
              'code-block border border-surface p-4 w-full !my-0',
              `${!title ? '!rounded-md' : '!rounded-t-none !rounded-b-md'}`,
              `${!showLineNumbers ? 'pl-6' : ''}`,
              className
            )}
            customStyle={{
              fontSize: large ? 18 : 13,
              lineHeight: large ? 1.5 : 1.4,
            }}
            showLineNumbers={showLineNumbers}
            lineProps={(lineNumber) => {
              if (linesToHighlight.includes(lineNumber)) {
                return {
                  style: { display: 'block', backgroundColor: 'hsl(var(--background-selection))' },
                }
              }
              return {}
            }}
            lineNumberContainerStyle={{
              paddingTop: '128px',
            }}
            lineNumberStyle={{
              minWidth: '44px',
              paddingLeft: '4px',
              paddingRight: '4px',
              marginRight: '12px',
              color: '#828282',
              textAlign: 'center',
              fontSize: large ? 14 : 12,
              paddingTop: '4px',
              paddingBottom: '4px',
            }}
            renderer={renderer}
          >
            {codeValue}
          </SyntaxHighlighter>
          {!hideCopy && (value || children) && className ? (
            <div
              className={[
                'absolute right-1 top-1',
                'opacity-0 group-hover:opacity-100 transition',
                `${isDarkTheme ? 'dark' : ''}`,
              ].join(' ')}
            >
              <Button
                onClick={handleCopy}
                data-size="tiny"
                type="button"
                variant="outline"
                className="relative"
              >
                <div className="text-foreground-muted mr-2">
                  <Copy size={14} />
                </div>{' '}
                <span className="truncate">{copied ? 'Copied' : 'Copy'}</span>
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <code className={shortCodeBlockClasses}>{value || children}</code>
      )}
    </>
  )
}

export const monokaiCustomTheme = (isDarkMode: boolean) => {
  return {
    hljs: {
      display: 'block',
      overflowX: 'auto',
      color: isDarkMode ? '#ddd' : '#888',
    },
    'hljs-tag': {
      color: '#569cd6',
    },
    'hljs-keyword': {
      color: '#569cd6',
      fontWeight: 'normal',
    },
    'hljs-selector-tag': {
      color: '#569cd6',
      fontWeight: 'normal',
    },
    'hljs-literal': {
      color: '#569cd6',
      fontWeight: 'normal',
    },
    'hljs-strong': {
      color: '#569cd6',
    },
    'hljs-name': {
      color: '#569cd6',
    },
    'hljs-code': {
      color: '#66d9ef',
    },
    'hljs-class .hljs-title': {
      color: 'gray',
    },
    'hljs-attribute': {
      color: '#bf79db',
    },
    'hljs-symbol': {
      color: '#bf79db',
    },
    'hljs-regexp': {
      color: '#bf79db',
    },
    'hljs-link': {
      color: '#bf79db',
    },
    'hljs-string': {
      color: '#3ECF8E',
    },
    'hljs-bullet': {
      color: '#3ECF8E',
    },
    'hljs-subst': {
      color: '#3ECF8E',
    },
    'hljs-title': {
      color: '#3ECF8E',
      fontWeight: 'normal',
    },
    'hljs-section': {
      color: '#3ECF8E',
      fontWeight: 'normal',
    },
    'hljs-emphasis': {
      color: '#3ECF8E',
    },
    'hljs-type': {
      color: '#3ECF8E',
      fontWeight: 'normal',
    },
    'hljs-built_in': {
      color: '#3ECF8E',
    },
    'hljs-builtin-name': {
      color: '#3ECF8E',
    },
    'hljs-selector-attr': {
      color: '#3ECF8E',
    },
    'hljs-selector-pseudo': {
      color: '#3ECF8E',
    },
    'hljs-addition': {
      color: '#3ECF8E',
    },
    'hljs-variable': {
      color: '#3ECF8E',
    },
    'hljs-template-tag': {
      color: '#3ECF8E',
    },
    'hljs-template-variable': {
      color: '#3ECF8E',
    },
    'hljs-comment': {
      color: isDarkMode ? '#999' : '#888',
    },
    'hljs-quote': {
      color: '#75715e',
    },
    'hljs-deletion': {
      color: '#75715e',
    },
    'hljs-meta': {
      color: '#75715e',
    },
    'hljs-doctag': {
      fontWeight: 'normal',
    },
    'hljs-selector-id': {
      fontWeight: 'normal',
    },
  }
}
