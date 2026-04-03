import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

// Remark plugins applied to all ReactMarkdown instances
export const REMARK_PLUGINS = [remarkGfm];

// Rehype plugins placeholder (e.g. rehype-highlight for syntax highlighting)
export const REHYPE_PLUGINS: never[] = [];

// Custom component overrides for ReactMarkdown
// Opens all links in a new tab safely
export const MARKDOWN_COMPONENTS: Components = {
  a({ href, children, ...props }) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  },
};
