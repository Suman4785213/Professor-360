import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../src/features/auth/resetPassword.ts',import.meta.url),'utf8');
const ctx={exports:{},URLSearchParams};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,ctx);
const {readResetToken,validateReset,resetError}=ctx.exports;
test('token read only from fragment, never query string',()=>{
 assert.equal(readResetToken({hash:'#token=fixture',search:'?token=leaked'}),'fixture');
 assert.equal(readResetToken({hash:'',search:'?token=leaked'}),'');
});
test('password validation and missing token',()=>{
 assert.ok(validateReset('longPassword','longPassword',''));
 assert.ok(validateReset('short','short','fixture'));
 assert.ok(validateReset('longPassword','different','fixture'));
 assert.equal(validateReset('longPassword','longPassword','fixture'),'');
});
test('invalid expired used tokens and rate limits show safe errors',()=>{
 assert.match(resetError({response:{status:400,data:{token:'secret'}}}),/invalid, expired or already used/);
 assert.match(resetError({response:{status:429}}),/Too many/);
 assert.ok(!resetError({response:{status:400,data:{token:'secret'}}}).includes('secret'));
});
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
function renderPage(hash) {
 const component=fs.readFileSync(new URL('../src/features/auth/ResetPasswordView.tsx',import.meta.url),'utf8');
 const context={exports:{},window:{location:{hash}},require(name){
   if(name==='react')return React;
   if(name==='react-router-dom')return {Link:p=>React.createElement('a',{href:p.to},p.children)};
   if(name==='axios')return {};
   if(name.endsWith('/client'))return {API_BASE:'https://example.invalid/api/v1'};
   if(name.endsWith('/Professor360Logo'))return {Professor360Logo:()=>React.createElement('span',null,'Professor360')};
   if(name==='./resetPassword')return ctx.exports;
   throw new Error('Unexpected import');
 }};
 vm.runInNewContext(ts.transpileModule(component,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,context);
 return renderToStaticMarkup(React.createElement(context.exports.ResetPasswordView));
}
test('reset form renders password fields for fragment link without displaying token',()=>{
 const html=renderPage('#token=private-fixture');
 assert.match(html,/New password/);assert.match(html,/Confirm password/);
 assert.match(html,/Professor360/);assert.ok(!html.includes('private-fixture'));
});
test('missing token renders email request and login navigation',()=>{
 const html=renderPage('');
 assert.match(html,/Email address/);assert.match(html,/Back to sign in/);
 assert.ok(!html.includes('Confirm password'));
});
