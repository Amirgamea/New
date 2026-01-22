import assert from 'node:assert';
import test from 'node:test';
import { markdownToHtml, createMarkdownParser } from '../lib/converter.js';

test('Converter Logic', async (t) => {
  
  await t.test('Should render inline LaTeX correctly', async () => {
    const md = 'The value is $\\text{T}_3$';
    const html = await markdownToHtml(md);
    
    // Check for MathML tag presence
    assert.match(html, /<math/);
    // Check if TeX is preserved in annotation or rendered
    // markdown-it-texmath with katex generates mathml
    assert.ok(html.includes('math'), 'Output should contain MathML tags');
  });

  await t.test('Should render tables correctly', async () => {
    const md = '| Col1 | Col2 |\n|---|---|\n| Val1 | Val2 |';
    const html = await markdownToHtml(md);
    assert.match(html, /<table>/);
    assert.match(html, /<td>Val1<\/td>/);
  });

  await t.test('Should render math inside tables', async () => {
    const md = '| Ion | Formula |\n|---|---|\n| Calcium | $Ca^{2+}$ |';
    const html = await markdownToHtml(md);
    assert.match(html, /<math/);
    assert.match(html, /Ca/);
  });
});
