import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ReactMarkdown from 'react-markdown';
import { MARKDOWN_COMPONENTS, REMARK_PLUGINS, REHYPE_PLUGINS } from '@/lib/markdown.tsx';

function renderMd(markdown: string) {
  return render(
    <ReactMarkdown
      remarkPlugins={REMARK_PLUGINS}
      rehypePlugins={REHYPE_PLUGINS}
      components={MARKDOWN_COMPONENTS}
    >
      {markdown}
    </ReactMarkdown>
  );
}

// ─── Plugin configuration ────────────────────────────────────────────────────

describe('markdown config', () => {
  it('REMARK_PLUGINS is a non-empty array', () => {
    expect(Array.isArray(REMARK_PLUGINS)).toBe(true);
    expect(REMARK_PLUGINS.length).toBeGreaterThan(0);
  });

  it('REHYPE_PLUGINS is an array', () => {
    expect(Array.isArray(REHYPE_PLUGINS)).toBe(true);
  });

  it('MARKDOWN_COMPONENTS defines an a override', () => {
    expect(typeof MARKDOWN_COMPONENTS.a).toBe('function');
  });
});

// ─── Headings ────────────────────────────────────────────────────────────────

describe('headings', () => {
  it('renders h1', () => {
    const { container } = renderMd('# Heading One');
    expect(container.querySelector('h1')).not.toBeNull();
    expect(container.querySelector('h1')?.textContent).toBe('Heading One');
  });

  it('renders h2', () => {
    const { container } = renderMd('## Heading Two');
    expect(container.querySelector('h2')).not.toBeNull();
    expect(container.querySelector('h2')?.textContent).toBe('Heading Two');
  });

  it('renders h3', () => {
    const { container } = renderMd('### Heading Three');
    expect(container.querySelector('h3')).not.toBeNull();
  });

  it('renders h4, h5, h6', () => {
    const { container } = renderMd('#### H4\n##### H5\n###### H6');
    expect(container.querySelector('h4')).not.toBeNull();
    expect(container.querySelector('h5')).not.toBeNull();
    expect(container.querySelector('h6')).not.toBeNull();
  });
});

// ─── Bold ────────────────────────────────────────────────────────────────────

describe('bold', () => {
  it('renders **text** as <strong>', () => {
    const { container } = renderMd('This is **bold** text.');
    const strong = container.querySelector('strong');
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe('bold');
  });

  it('renders __text__ as <strong>', () => {
    const { container } = renderMd('This is __bold__ text.');
    expect(container.querySelector('strong')).not.toBeNull();
  });
});

// ─── Italic ──────────────────────────────────────────────────────────────────

describe('italic', () => {
  it('renders *text* as <em>', () => {
    const { container } = renderMd('This is *italic* text.');
    const em = container.querySelector('em');
    expect(em).not.toBeNull();
    expect(em?.textContent).toBe('italic');
  });

  it('renders _text_ as <em>', () => {
    const { container } = renderMd('This is _italic_ text.');
    expect(container.querySelector('em')).not.toBeNull();
  });
});

// ─── Lists ───────────────────────────────────────────────────────────────────

describe('unordered lists', () => {
  it('renders - items as <ul><li>', () => {
    const { container } = renderMd('- Item one\n- Item two\n- Item three');
    expect(container.querySelector('ul')).not.toBeNull();
    expect(container.querySelectorAll('li')).toHaveLength(3);
  });

  it('renders * items as <ul><li>', () => {
    const { container } = renderMd('* Alpha\n* Beta');
    expect(container.querySelector('ul')).not.toBeNull();
    expect(container.querySelectorAll('li')).toHaveLength(2);
  });

  it('list item text is preserved', () => {
    const { container } = renderMd('- First item');
    expect(container.querySelector('li')?.textContent).toBe('First item');
  });
});

describe('ordered lists', () => {
  it('renders numbered items as <ol><li>', () => {
    const { container } = renderMd('1. Step one\n2. Step two\n3. Step three');
    expect(container.querySelector('ol')).not.toBeNull();
    expect(container.querySelectorAll('li')).toHaveLength(3);
  });
});

// ─── Code blocks ─────────────────────────────────────────────────────────────

describe('code blocks', () => {
  it('renders fenced code block as <pre><code>', () => {
    const { container } = renderMd('```\nconst x = 1;\n```');
    expect(container.querySelector('pre')).not.toBeNull();
    expect(container.querySelector('pre code')).not.toBeNull();
  });

  it('preserves code block content', () => {
    const { container } = renderMd('```\nhello world\n```');
    expect(container.querySelector('pre code')?.textContent?.trim()).toBe('hello world');
  });

  it('renders fenced code block with language annotation', () => {
    const { container } = renderMd('```javascript\nconst x = 1;\n```');
    expect(container.querySelector('pre code')).not.toBeNull();
  });

  it('renders inline code as <code>', () => {
    const { container } = renderMd('Use the `console.log()` function.');
    const codes = container.querySelectorAll('code');
    // Should have at least one inline code element (not inside pre)
    const inlineCode = Array.from(codes).find((el) => el.closest('pre') === null);
    expect(inlineCode).not.toBeUndefined();
    expect(inlineCode?.textContent).toBe('console.log()');
  });
});

// ─── Links ───────────────────────────────────────────────────────────────────

describe('links', () => {
  it('renders [text](url) as <a href>', () => {
    const { container } = renderMd('[Visit site](https://example.com)');
    const link = container.querySelector('a');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('https://example.com');
    expect(link?.textContent).toBe('Visit site');
  });

  it('custom a component adds target="_blank"', () => {
    const { container } = renderMd('[Link](https://example.com)');
    expect(container.querySelector('a')?.getAttribute('target')).toBe('_blank');
  });

  it('custom a component adds rel="noopener noreferrer"', () => {
    const { container } = renderMd('[Link](https://example.com)');
    expect(container.querySelector('a')?.getAttribute('rel')).toBe('noopener noreferrer');
  });
});

// ─── GFM extensions (remark-gfm) ─────────────────────────────────────────────

describe('GFM extensions via remark-gfm', () => {
  it('renders strikethrough ~~text~~ as <del>', () => {
    const { container } = renderMd('~~strikethrough~~');
    expect(container.querySelector('del')).not.toBeNull();
    expect(container.querySelector('del')?.textContent).toBe('strikethrough');
  });

  it('renders GFM table', () => {
    const tableMarkdown = '| Col A | Col B |\n|-------|-------|\n| val1  | val2  |';
    const { container } = renderMd(tableMarkdown);
    expect(container.querySelector('table')).not.toBeNull();
    expect(container.querySelector('th')).not.toBeNull();
    expect(container.querySelector('td')).not.toBeNull();
  });

  it('renders GFM task list checkboxes', () => {
    const { container } = renderMd('- [x] Done\n- [ ] Todo');
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes).toHaveLength(2);
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(true);
    expect((checkboxes[1] as HTMLInputElement).checked).toBe(false);
  });
});

// ─── Combined Markdown document ───────────────────────────────────────────────

describe('full markdown document', () => {
  const fullDoc = `# Project Notes

## Overview

This is a **note-taking** app with *Markdown* support.

### Features

- Create notes
- Edit with \`live preview\`
- **Bold** and _italic_ text

\`\`\`typescript
const greeting = "hello";
console.log(greeting);
\`\`\`

Check out the [docs](https://example.com) for more.`;

  it('renders all element types without errors', () => {
    expect(() => renderMd(fullDoc)).not.toThrow();
  });

  it('renders h1 in full document', () => {
    const { container } = renderMd(fullDoc);
    expect(container.querySelector('h1')?.textContent).toBe('Project Notes');
  });

  it('renders h2 in full document', () => {
    const { container } = renderMd(fullDoc);
    expect(container.querySelector('h2')?.textContent).toBe('Overview');
  });

  it('renders strong in full document', () => {
    const { container } = renderMd(fullDoc);
    expect(container.querySelector('strong')).not.toBeNull();
  });

  it('renders em in full document', () => {
    const { container } = renderMd(fullDoc);
    expect(container.querySelector('em')).not.toBeNull();
  });

  it('renders ul+li in full document', () => {
    const { container } = renderMd(fullDoc);
    expect(container.querySelector('ul li')).not.toBeNull();
  });

  it('renders code block in full document', () => {
    const { container } = renderMd(fullDoc);
    expect(container.querySelector('pre code')).not.toBeNull();
  });

  it('renders link with safe attributes in full document', () => {
    const { container } = renderMd(fullDoc);
    const link = container.querySelector('a[href="https://example.com"]');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
  });
});

// ─── Live preview: re-render on content change ────────────────────────────────

describe('live preview re-render', () => {
  it('updates rendered output when markdown content changes', () => {
    const { rerender, container } = render(
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={MARKDOWN_COMPONENTS}>
        {'# First Title'}
      </ReactMarkdown>
    );
    expect(container.querySelector('h1')?.textContent).toBe('First Title');

    rerender(
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={MARKDOWN_COMPONENTS}>
        {'# Updated Title'}
      </ReactMarkdown>
    );
    expect(container.querySelector('h1')?.textContent).toBe('Updated Title');
  });

  it('removes elements when they are deleted from content', () => {
    const { rerender, container } = render(
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={MARKDOWN_COMPONENTS}>
        {'**bold text**'}
      </ReactMarkdown>
    );
    expect(container.querySelector('strong')).not.toBeNull();

    rerender(
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={MARKDOWN_COMPONENTS}>
        {'plain text'}
      </ReactMarkdown>
    );
    expect(container.querySelector('strong')).toBeNull();
  });
});
