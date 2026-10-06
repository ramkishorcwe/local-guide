import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';

test('compiled Vercel entrypoints load in native Node ESM without the tsx resolver', () => {
  const root = process.cwd();
  const tempBase = resolve(root, 'node_modules/.tmp');
  mkdirSync(tempBase, { recursive: true });
  const output = mkdtempSync(join(tempBase, 'guide-esm-'));
  const compiled = new Set<string>();
  const compile = (sourcePath: string) => {
    if (compiled.has(sourcePath)) return;
    compiled.add(sourcePath);
    const result = ts.transpileModule(readFileSync(sourcePath, 'utf8'), { compilerOptions: {
      target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, verbatimModuleSyntax: true,
    } }).outputText;
    const target = join(output, relative(root, sourcePath).replace(/\.ts$/, '.js'));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, result);
    const parsed = ts.createSourceFile(target, result, ts.ScriptTarget.ES2023, true, ts.ScriptKind.JS);
    for (const statement of parsed.statements) {
      if ((!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement))
        || !statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const specifier = statement.moduleSpecifier.text;
      if (!specifier.startsWith('.')) continue;
      assert.ok(specifier.endsWith('.js'), `${relative(root, sourcePath)} must use a .js runtime import: ${specifier}`);
      compile(resolve(dirname(sourcePath), specifier.replace(/\.js$/, '.ts')));
    }
  };
  try {
    writeFileSync(join(output, 'package.json'), '{"type":"module"}');
    for (const entry of ['api/chat.ts', 'api/bookings.ts']) compile(resolve(root, entry));
    const urls = ['api/chat.js', 'api/bookings.js'].map(entry => pathToFileURL(join(output, entry)).href);
    const child = spawnSync(process.execPath, ['--input-type=module', '-e',
      `for (const url of ${JSON.stringify(urls)}) { const entry = await import(url); if (typeof entry.default !== 'function') throw new Error('Missing handler'); }`],
    { encoding: 'utf8', timeout: 30_000 });
    assert.equal(child.status, 0, child.stderr || child.error?.message);
  } finally {
    assert.ok(output.startsWith(tempBase + sep) && output !== tempBase);
    rmSync(output, { recursive: true, force: true });
  }
});
