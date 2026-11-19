/// <reference types="node" />
import { it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

it('wraps native screen text in text components', () => {
 const failures: string[] = [];
 function scan(directory: string) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
   const path = join(directory, entry.name);
   if (entry.isDirectory()) { scan(path); continue; }
   if (!path.endsWith('.tsx')) continue;
   const file = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
   function visit(node: ts.Node) {
    if (ts.isJsxElement(node)) {
     const tag = node.openingElement.tagName.getText(file);
     if (!['Text', 'Title'].includes(tag)) {
      for (const child of node.children) {
       if ((ts.isJsxText(child) && child.text.trim()) ||
           (ts.isJsxExpression(child) && child.expression && ts.isStringLiteral(child.expression))) {
        failures.push(`${path}: raw string inside ${tag}`);
       }
      }
     }
    }
    ts.forEachChild(node, visit);
   }
   visit(file);
  }
 }
 scan('app'); scan('src'); expect(failures).toEqual([]);
});
