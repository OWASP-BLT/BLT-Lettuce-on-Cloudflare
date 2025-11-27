import { describe, it, expect } from 'vitest';
import { markdownToSlackBlocks } from '../src/slack';

describe('markdownToSlackBlocks', () => {
  it('should convert a header to a Slack header block', () => {
    const markdown = '# Welcome!';
    const blocks = markdownToSlackBlocks(markdown);
    
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('header');
    expect(blocks[0].text?.text).toBe('Welcome!');
  });

  it('should convert a level 2 header to a bold section', () => {
    const markdown = '## Getting Started';
    const blocks = markdownToSlackBlocks(markdown);
    
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('section');
    expect(blocks[0].text?.text).toBe('*Getting Started*');
  });

  it('should convert horizontal rules to dividers', () => {
    const markdown = '---';
    const blocks = markdownToSlackBlocks(markdown);
    
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('divider');
  });

  it('should convert markdown links to Slack links', () => {
    const markdown = 'Check out [OWASP](https://owasp.org)!';
    const blocks = markdownToSlackBlocks(markdown);
    
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('section');
    expect(blocks[0].text?.text).toContain('<https://owasp.org|OWASP>');
  });

  it('should convert bold markdown to Slack bold', () => {
    const markdown = 'This is **bold** text';
    const blocks = markdownToSlackBlocks(markdown);
    
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text?.text).toContain('*bold*');
  });

  it('should handle multiple blocks', () => {
    const markdown = `# Welcome

This is a paragraph.

## Section

More text here.`;
    
    const blocks = markdownToSlackBlocks(markdown);
    
    expect(blocks.length).toBeGreaterThan(2);
    expect(blocks[0].type).toBe('header');
  });

  it('should handle empty input', () => {
    const markdown = '';
    const blocks = markdownToSlackBlocks(markdown);
    
    expect(blocks).toHaveLength(0);
  });
});
