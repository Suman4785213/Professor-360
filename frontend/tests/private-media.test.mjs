import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
function setup(fail=false) {
 const requests=[];const revoked=[];
 const tab={opener:{},location:{href:''},closed:false,close(){this.closed=true;}};
 const browser={location:{origin:'https://web.example.invalid'},open:()=>tab,alert:()=>{}};
 class TestURL extends URL { static createObjectURL(){return 'blob:fixture';} static revokeObjectURL(url){revoked.push(url);} }
 const context={exports:{},URL:TestURL,window:browser,setTimeout:fn=>fn(),require(name){
  if(name==='react')return React;
  if(name==='./client')return {API_BASE:'https://api.example.invalid/api/v1',apiClient:{get:async(url,options)=>{requests.push({url,options});if(fail)throw new Error('denied');return {data:new Blob(['fixture'])};}}};
  throw new Error(name);
 }};
 const src=fs.readFileSync(new URL('../src/api/privateMedia.tsx',import.meta.url),'utf8');
 vm.runInNewContext(ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,context);
 return {...context.exports,requests,tab,revoked};
}
test('only API-origin media and document/report routes get credentials',()=>{
 const s=setup();
 assert.equal(s.privateFileURL('/media/faculty/resume.pdf'),'https://api.example.invalid/media/faculty/resume.pdf');
 assert.equal(s.privateFileURL('https://evil.example/media/private.pdf'),null);
 assert.equal(s.privateFileURL('javascript:alert(1)'),null);
 assert.equal(s.privateFileURL('/api/v1/auth/me/'),null);
});
test('file opens only after authenticated blob request',async()=>{
 const s=setup();await s.openPrivateFile('/api/v1/documents/fixture/download/');
 assert.equal(s.requests.length,1);assert.equal(s.requests[0].options.responseType,'blob');
 assert.equal(s.tab.location.href,'blob:fixture');assert.equal(s.tab.opener,null);
});
test('denied file closes preview without navigation',async()=>{
 const s=setup(true);await s.openPrivateFile('/media/faculty/resume.pdf');
 assert.equal(s.tab.closed,true);assert.equal(s.tab.location.href,'');
});
