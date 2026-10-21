import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const files = new Map([
  ['/', ['index.html', 'text/html']],
  ['/styles.css', ['styles.css', 'text/css']],
  ['/app.mjs', ['app.mjs', 'text/javascript']],
  ['/checks.mjs', ['checks.mjs', 'text/javascript']],
  ['/readability.mjs', ['readability.mjs', 'text/javascript']],
  ['/engine.mjs', ['engine.mjs', 'text/javascript']],
  ['/rules.mjs', ['rules.mjs', 'text/javascript']],
  ['/upstream-rules.mjs', ['upstream-rules.mjs', 'text/javascript']],
  ['/vendor/retext-simplify/patterns.mjs', ['vendor/retext-simplify/patterns.mjs', 'text/javascript']],
  ['/vendor/write-good/lexicons.mjs', ['vendor/write-good/lexicons.mjs', 'text/javascript']],
  ['/vendor/proselint/checks.mjs', ['vendor/proselint/checks.mjs', 'text/javascript']],
  ['/vendor/textstat/formulas.mjs', ['vendor/textstat/formulas.mjs', 'text/javascript']],
  ['/spell.mjs', ['spell.mjs', 'text/javascript']],
  ['/vendor/dictionary-en/dictionary.mjs', ['vendor/dictionary-en/dictionary.mjs', 'text/javascript']],
  ['/vendor/misspell/corrections.mjs', ['vendor/misspell/corrections.mjs', 'text/javascript']],
]);
const port = Number(process.env.PORT || 4173);
export const server = createServer(async (req, res) => {
  const headers = {
    'Content-Security-Policy': "default-src 'self'; connect-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'no-store',
  };
  const file = files.get(req.url);
  if (!['GET', 'HEAD'].includes(req.method) || !file) {
    res.writeHead(404, headers).end('Not found');
    return;
  }
  try {
    const data = await readFile(new URL(file[0], import.meta.url));
    res.writeHead(200, { ...headers, 'Content-Type': `${file[1]}; charset=utf-8` });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    res.writeHead(500, headers).end('Unable to load application');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Rewriter is ready at http://127.0.0.1:${server.address().port}`));
