/**
 * Markdown Renderer Component
 * Renders markdown content with syntax highlighting and math support
 * 
 * Math Rendering Features:
 * - Handles multiple LaTeX delimiters: \[ \], \( \), $$ $$, $ $
 * - Fixes double-escaped backslashes (\\frac -> \frac)
 * - Supports common LaTeX commands and Greek letters
 * - Uses \cr instead of \\ for better line breaks in matrices/alignments
 * - Includes common mathematical macros (\RR, \NN, etc.)
 * - Error-tolerant rendering (shows errors instead of crashing)
 */

'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Preprocesses markdown content to fix common LaTeX/math rendering issues
 */
function preprocessMathContent(content: string): string {
  // Handle different math delimiters that AI models might use
  let processed = content;
  
  // Convert \[ \] to $$ $$ for display math
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, '$$\n$1\n$$');
  
  // Convert \( \) to $ $ for inline math
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
  
  // Fix double backslashes in math expressions
  // This handles the common issue where LaTeX commands get double-escaped
  processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (match, mathContent) => {
    // Fix common LaTeX commands that get double-escaped
    let fixedContent = mathContent
      // Fix fractions
      .replace(/\\\\frac/g, '\\frac')
      // Fix square roots
      .replace(/\\\\sqrt/g, '\\sqrt')
      // Fix Greek letters
      .replace(/\\\\(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)/g, '\\$1')
      .replace(/\\\\(Alpha|Beta|Gamma|Delta|Epsilon|Zeta|Eta|Theta|Iota|Kappa|Lambda|Mu|Nu|Xi|Omicron|Pi|Rho|Sigma|Tau|Upsilon|Phi|Chi|Psi|Omega)/g, '\\$1')
      // Fix common math operators
      .replace(/\\\\(sum|prod|int|oint|iint|iiint|lim|inf|sup)/g, '\\$1')
      // Fix brackets and parentheses
      .replace(/\\\\(left|right)/g, '\\$1')
      // Fix text commands
      .replace(/\\\\(text|mathrm|mathbf|mathit|mathcal|mathbb|mathfrak)/g, '\\$1')
      // Fix alignment commands (use \cr instead of \\ for better compatibility)
      .replace(/\\\\\s*$/gm, ' \\cr')
      .replace(/\\\\\s*(?=\S)/g, ' \\cr ')
      // Fix begin/end environments
      .replace(/\\\\(begin|end)/g, '\\$1');
    
    return '$$' + fixedContent + '$$';
  });
  
  // Fix inline math as well
  processed = processed.replace(/\$([^$\n]+)\$/g, (match, mathContent) => {
    let fixedContent = mathContent
      .replace(/\\\\frac/g, '\\frac')
      .replace(/\\\\sqrt/g, '\\sqrt')
      .replace(/\\\\(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)/g, '\\$1')
      .replace(/\\\\(Alpha|Beta|Gamma|Delta|Epsilon|Zeta|Eta|Theta|Iota|Kappa|Lambda|Mu|Nu|Xi|Omicron|Pi|Rho|Sigma|Tau|Upsilon|Phi|Chi|Psi|Omega)/g, '\\$1')
      .replace(/\\\\(sum|prod|int|oint|iint|iiint|lim|inf|sup)/g, '\\$1')
      .replace(/\\\\(left|right)/g, '\\$1')
      .replace(/\\\\(text|mathrm|mathbf|mathit|mathcal|mathbb|mathfrak)/g, '\\$1');
    
    return '$' + fixedContent + '$';
  });
  
  // Ensure proper spacing around display math
  processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, '\n\n$$$$1$$\n\n');
  
  // Clean up excessive newlines
  processed = processed.replace(/\n{3,}/g, '\n\n');
  
  return processed;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  // Preprocess the content to fix math rendering issues
  const processedContent = preprocessMathContent(content);
  
  return (
    <div className={`prose prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          [rehypeKatex, {
            // KaTeX options for better rendering
            throwOnError: false, // Don't throw on math errors, show error instead
            errorColor: '#cc0000',
            strict: false, // Allow some non-standard LaTeX
            trust: false, // Don't trust user input for security
            macros: {
              // Define common macros that might be missing
              "\\RR": "\\mathbb{R}",
              "\\NN": "\\mathbb{N}",
              "\\ZZ": "\\mathbb{Z}",
              "\\QQ": "\\mathbb{Q}",
              "\\CC": "\\mathbb{C}",
              "\\FF": "\\mathbb{F}",
              "\\PP": "\\mathbb{P}",
              "\\EE": "\\mathbb{E}",
              "\\Var": "\\text{Var}",
              "\\Cov": "\\text{Cov}",
              "\\Cor": "\\text{Cor}",
            }
          }]
        ]}
        components={{
          // Code blocks with syntax highlighting
          code({ node, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const isInline = !match;
            
            if (!isInline && language) {
              return (
                <div className="relative group">
                  {/* Language label */}
                  <div className="absolute top-0 right-0 px-3 py-1 text-xs font-medium text-zinc-400 bg-[#1a1a1a] rounded-bl-lg border-l border-b border-[#3f3f46]">
                    {language}
                  </div>
                  
                  {/* Copy button */}
                  <button
                    onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                    className="absolute top-2 right-16 p-2 text-zinc-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100 bg-[#2d2d2d] rounded-lg border border-[#3f3f46]"
                    title="Copy code"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  
                  <SyntaxHighlighter
                    style={oneDark as any}
                    language={language}
                    PreTag="div"
                    customStyle={{
                      margin: 0,
                      borderRadius: '0.75rem',
                      background: '#1a1a1a',
                      border: '1px solid #3f3f46',
                      fontSize: '0.875rem',
                      lineHeight: '1.5',
                    } as any}
                    codeTagProps={{
                      style: {
                        fontSize: '0.875rem',
                        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                      }
                    }}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                </div>
              );
            }
            
            // Inline code
            return (
              <code 
                className="px-1.5 py-0.5 text-sm font-mono bg-[#2d2d2d] text-[#8b5cf6] rounded border border-[#3f3f46]" 
                {...props}
              >
                {children}
              </code>
            );
          },
          
          // Headers
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-white mb-4 mt-6 first:mt-0 border-b border-[#3f3f46] pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold text-white mb-3 mt-5 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold text-white mb-2 mt-4 first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold text-white mb-2 mt-3 first:mt-0">
              {children}
            </h4>
          ),
          
          // Paragraphs
          p: ({ children }) => (
            <p className="text-zinc-200 mb-4 leading-relaxed">
              {children}
            </p>
          ),
          
          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside text-zinc-200 mb-4 space-y-1">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside text-zinc-200 mb-4 space-y-1">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-zinc-200">
              {children}
            </li>
          ),
          
          // Links
          a: ({ href, children }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#8b5cf6] hover:text-[#7c3aed] underline transition-colors"
            >
              {children}
            </a>
          ),
          
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-[#8b5cf6] pl-4 py-2 my-4 bg-[#8b5cf6]/5 text-zinc-300 italic">
              {children}
            </blockquote>
          ),
          
          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full border border-[#3f3f46] rounded-lg">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#2d2d2d]">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 text-left text-white font-semibold border-b border-[#3f3f46]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-zinc-200 border-b border-[#3f3f46]">
              {children}
            </td>
          ),
          
          // Horizontal rule
          hr: () => (
            <hr className="border-[#3f3f46] my-6" />
          ),
          
          // Strong/Bold
          strong: ({ children }) => (
            <strong className="font-semibold text-white">
              {children}
            </strong>
          ),
          
          // Emphasis/Italic
          em: ({ children }) => (
            <em className="italic text-zinc-300">
              {children}
            </em>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}