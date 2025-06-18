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
 * Language icon component that loads SVG from public directory
 */
function LanguageIcon({ language }: { language: string }) {
  const [iconFailed, setIconFailed] = React.useState(false);
  const normalizedLang = language.toLowerCase();
  
  // Map of language names to their icon file names
  const iconMap: Record<string, string> = {
    javascript: 'javascript.svg',
    js: 'javascript.svg',
    typescript: 'typescript.svg',
    ts: 'typescript.svg',
    python: 'python.svg',
    py: 'python.svg',
    java: 'java.svg',
    csharp: 'csharp.svg',
    'c#': 'csharp.svg',
    cpp: 'cpp.svg',
    'c++': 'cpp.svg',
    c: 'c.svg',
    go: 'go.svg',
    golang: 'go.svg',
    rust: 'rust.svg',
    rs: 'rust.svg',
    php: 'php.svg',
    ruby: 'ruby.svg',
    rb: 'ruby.svg',
    swift: 'swift.svg',
    kotlin: 'kotlin.svg',
    kt: 'kotlin.svg',
    dart: 'dart.svg',
    html: 'html.svg',
    html5: 'html.svg',
    css: 'css.svg',
    css3: 'css.svg',
    sql: 'sql.svg',
    json: 'json.svg',
    xml: 'xml.svg',
    yaml: 'yaml.svg',
    yml: 'yaml.svg',
    bash: 'bash.svg',
    shell: 'shell.svg',
    sh: 'shell.svg',
    powershell: 'powershell.svg',
    ps1: 'powershell.svg',
    dockerfile: 'docker.svg',
    docker: 'docker.svg',
    markdown: 'markdown.svg',
    md: 'markdown.svg',
    nodejs: 'nodejs.svg',
    node: 'nodejs.svg',
    react: 'react.svg',
    jsx: 'react.svg',
    tsx: 'react.svg',
    vue: 'vue.svg',
    vuejs: 'vue.svg',
  };

  const iconFile = iconMap[normalizedLang];
  
  // If we have an icon file and it hasn't failed to load, show the icon
  if (iconFile && !iconFailed) {
    return (
      <div className="flex items-center justify-center w-5 h-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={`/icons/languages/${iconFile}`} 
          alt={`${language} icon`}
          className="w-5 h-5 object-contain"
          onError={() => setIconFailed(true)}
        />
      </div>
    );
  }
  
  // Fallback for unknown languages or failed icon loads
  return (
    <div className="w-5 h-5 bg-purple-500 rounded-sm flex items-center justify-center">
      <span className="text-white text-xs font-bold">{language.charAt(0).toUpperCase()}</span>
    </div>
  );
}

/**
 * Get file extension for a given language
 */
function getFileExtension(language: string): string {
  const extensionMap: Record<string, string> = {
    javascript: 'js',
    js: 'js',
    typescript: 'ts',
    ts: 'ts',
    python: 'py',
    py: 'py',
    java: 'java',
    csharp: 'cs',
    'c#': 'cs',
    cpp: 'cpp',
    'c++': 'cpp',
    c: 'c',
    go: 'go',
    golang: 'go',
    rust: 'rs',
    rs: 'rs',
    php: 'php',
    ruby: 'rb',
    rb: 'rb',
    swift: 'swift',
    kotlin: 'kt',
    kt: 'kt',
    dart: 'dart',
    html: 'html',
    html5: 'html',
    css: 'css',
    css3: 'css',
    sql: 'sql',
    json: 'json',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yml',
    bash: 'sh',
    shell: 'sh',
    sh: 'sh',
    powershell: 'ps1',
    ps1: 'ps1',
    dockerfile: 'dockerfile',
    docker: 'dockerfile',
    markdown: 'md',
    md: 'md',
    nodejs: 'js',
    node: 'js',
    react: 'jsx',
    jsx: 'jsx',
    tsx: 'tsx',
    vue: 'vue',
    vuejs: 'vue',
  };
  
  return extensionMap[language.toLowerCase()] || 'txt';
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
    const fixedContent = mathContent
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
    const fixedContent = mathContent
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
    <div className={`max-w-none ${className}`}>
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
          // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
          code({ node, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const isInline = !match;
            
            if (!isInline && language) {
              const codeContent = String(children).replace(/\n$/, '');
              const fileExtension = getFileExtension(language);
              
              const handleCopy = () => {
                navigator.clipboard.writeText(codeContent);
              };
              
              const handleDownload = () => {
                const blob = new Blob([codeContent], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `code.${fileExtension}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              };
              
              return (
                <div className="relative my-6 rounded-xl overflow-hidden border border-border bg-card shadow-lg">
                  {/* Header with language icon and action buttons */}
                  <div className="flex items-center justify-between px-4 py-3 bg-secondary border-b border-border">
                    {/* Language icon */}
                    <div className="flex items-center">
                      <LanguageIcon language={language} />
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      {/* Copy button */}
                      <button
                        onClick={handleCopy}
                        className="p-2 text-text-muted hover:text-text-primary hover:bg-muted transition-all duration-200 rounded-lg group"
                        title="Copy code"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      
                      {/* Download button */}
                      <button
                        onClick={handleDownload}
                        className="p-2 text-text-muted hover:text-text-primary hover:bg-muted transition-all duration-200 rounded-lg group"
                        title={`Download as .${fileExtension}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {/* Code content */}
                  <div className="relative rounded-b-xl" style={{ backgroundColor: 'var(--code-bg)' }}>
                    <SyntaxHighlighter
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      style={oneDark as any}
                      language={language}
                      PreTag="div"
                      customStyle={{
                        margin: 0,
                        borderRadius: 0,
                        background: 'var(--code-bg)',
                        border: 'none',
                        fontSize: '0.875rem',
                        lineHeight: '1.6',
                        padding: '1.5rem',
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      } as any}
                      codeTagProps={{
                        style: {
                          fontSize: '0.875rem',
                          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                          background: 'transparent',
                        }
                      }}
                    >
                      {codeContent}
                    </SyntaxHighlighter>
                  </div>
                </div>
              );
            }
            
            // Inline code
            return (
              <code 
                className="font-mono text-text-secondary bg-muted/30 px-1.5 py-0.5 rounded-md" 
                {...props}
              >
                {children}
              </code>
            );
          },
          
          // Headers
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-primary mb-4 mt-6 first:mt-0 border-b border-border pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold text-primary mb-3 mt-5 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold text-primary mb-2 mt-4 first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold text-primary mb-2 mt-3 first:mt-0">
              {children}
            </h4>
          ),
          
          // Paragraphs
          p: ({ children }) => (
            <p className="text-primary mb-4 leading-relaxed">
              {children}
            </p>
          ),
          
          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside text-primary mb-4 space-y-1">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside text-primary mb-4 space-y-1">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-primary">
              {children}
            </li>
          ),
          
          // Links
          a: ({ href, children }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:text-accent underline transition-colors"
            >
              {children}
            </a>
          ),
          
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-4 py-2 my-4 bg-primary/5 text-primary italic">
              {children}
            </blockquote>
          ),
          
          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full border border-border rounded-lg">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/20">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 text-left text-primary font-semibold border-b border-border">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-primary border-b border-border">
              {children}
            </td>
          ),
          
          // Horizontal rule
          hr: () => (
            <hr className="border-purple-500/30 my-6" />
          ),
          
          // Strong/Bold
          strong: ({ children }) => (
            <strong className="font-semibold text-primary">
              {children}
            </strong>
          ),
          
          // Emphasis/Italic
          em: ({ children }) => (
            <em className="italic text-primary">
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