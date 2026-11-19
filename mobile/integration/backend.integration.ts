// Only the isolated Django runner supplies this short-lived fixture, never a real environment.
import { expect, test } from "vitest";
import { createSessionClient } from "../src/services/client";
import { userSchema, type Tokens } from "../src/types";
import { workflowApi, type Activity } from "../src/features/activities/api";
import { operationApi, pageRows } from "../src/features/operations/api";

const fixture = JSON.parse(process.env.P360_HTTP_FIXTURE || "null");
if (!fixture || !/^http:\/\/127\.0\.0\.1:\d+\/api\/v1\/$/.test(fixture.base))
  throw new Error("Run through backend/run_security_tests.py apps.accounts.tests_mobile_http");
const invalidate = async () => {};
async function actor(role: string, foreign = false) {
  let stored: Tokens | null = null;
  const vault = { read: async () => stored, write: async (v: Tokens | null) => { stored = v; } };
  const session = createSessionClient(fixture.base, vault, () => {});
  const r = await session.publicApi.post("auth/login/", {
    email: foreign ? fixture.foreign_email : fixture.accounts[role], password: fixture.password,
    ...(role === "SUPER_ADMIN" ? { is_super_admin: true } : { college_id: foreign ? fixture.foreign_college : fixture.college }),
  });
  const user = userSchema.parse(r.data.user);
  expect(user.role).toBe(role);
  await session.commit({access: r.data.access, refresh: r.data.refresh}, session.version());
  return { session, user, vault, ops: operationApi(session.api, user, invalidate), work: workflowApi(session.api, user, invalidate) };
}
// Never let Axios print bearer headers or fixture passwords on failure.
async function safe(fn: () => Promise<void>) {
  try { await fn(); } catch (e) {
    const error = e as { isAxiosError?: boolean; response?: {status: number}; config?: {url?: string} };
    if (error.isAxiosError) throw new Error(`HTTP failure ${error.response?.status || 'network'} at ${error.config?.url?.split('?')[0]}`);
    throw e;
  }
}
test("real HTTP: public search, six logins, restore, automatic refresh rotation and logout blacklist", () => safe(async () => {
  for (const role of Object.keys(fixture.accounts)) {
    const a = await actor(role);
    const search = await a.session.publicApi.get("colleges/public/?q=Disposable");
    expect(search.data.results.some((c: {id: string}) => c.id === fixture.college)).toBe(true);
    const restored = createSessionClient(fixture.base, a.vault, () => {});
    await restored.load();
    expect((await restored.api.get("auth/me/")).data.id).toBe(a.user.id);
    const old = (await a.vault.read())!;
    await restored.commit({...old, access: "deliberately-expired-test-token"}, restored.version());
    expect((await restored.api.get("auth/me/")).data.id).toBe(a.user.id);
    const rotated = (await a.vault.read())!;
    expect(rotated.refresh === old.refresh).toBe(false);
    expect((await restored.publicApi.post("auth/refresh/", {refresh: old.refresh}, {validateStatus: () => true})).status).toBe(401);
    await restored.logout();
    expect(await a.vault.read()).toBeNull();
    expect((await restored.publicApi.post("auth/refresh/", {refresh: rotated.refresh}, {validateStatus: () => true})).status).toBe(401);
  }
}));

test("real HTTP: draft edit, multipart upload/download, correction, three reviews, isolation", () => safe(async () => {
  const f = await actor("FACULTY"), inc = await actor("DEPARTMENT_INCHARGE"), hod = await actor("HOD"), iqac = await actor("IQAC"), foreign = await actor("FACULTY", true);
  const raw = {title: "Disposable HTTP activity", activity_type: "FDP", academic_year: fixture.year,
    organizer:"", venue:"", location:"", start_date:"", end_date:"", duration:"", duration_days:"",
    duration_hours:"", description:"", additional_remarks:"", certificate_number:"", category:"", is_online:false};
  let activity = await f.work.save(raw);
  const path = `activities/${activity.id}/`;
  const get = async () => (await f.session.api.get<Activity>(path)).data;
  activity = await f.work.save({...raw, title: "Edited HTTP activity"}, activity);
  expect(activity.title).toBe("Edited HTTP activity");
  // Node FormData exercises actual multipart backend transport, not native picker/URI support.
  const bytes = "%PDF-1.4\nDisposable test certificate\n%%EOF";
  const form = new FormData();
  form.append("activity", activity.id); form.append("file_name", "Evidence"); form.append("document_type", "CERTIFICATE");
  form.append("file", new Blob([bytes], {type:"application/pdf"}), "certificate.pdf");
  const doc = (await f.session.api.post("documents/", form)).data;
  const binary = await f.session.api.get(doc.download_url, {responseType:"arraybuffer"});
  expect(Buffer.from(binary.data).toString()).toBe(bytes);
  const anonymous = await f.session.publicApi.get(doc.file, {validateStatus: () => true});
  expect([401,403,404]).toContain(anonymous.status);
  expect(Buffer.from((await f.session.api.get(doc.file, {responseType:"arraybuffer"})).data).toString()).toBe(bytes);
  expect((await foreign.session.api.get(doc.file, {validateStatus: () => true})).status).toBe(404);
  expect((await foreign.session.api.get(doc.download_url, {validateStatus: () => true})).status).toBe(404);
  await f.work.submit(activity);
  activity = await get();
  expect(activity.status).toBe("PENDING_INCHARGE");
  const record = `verifications/${activity.verification_details!.id}/`;
  const review = async (a: typeof inc, decision: "APPROVE" | "REJECT") => a.work.decide((await a.session.api.get(record)).data, decision, "HTTP test correction/review");
  expect((await f.session.api.post(record+"incharge-verify/", {decision:"APPROVE"}, {validateStatus: () => true})).status).toBe(403);
  await review(inc, "REJECT");
  activity = await get(); expect(activity.status).toBe("RETURNED_TO_FACULTY");
  activity = await f.work.save({...raw, title:"Corrected HTTP activity"}, activity);
  await f.work.submit(activity);
  await review(inc,"APPROVE"); await review(hod,"REJECT");
  expect((await get()).status).toBe("RETURNED_TO_INCHARGE");
  await review(inc,"APPROVE"); await review(hod,"APPROVE"); await review(iqac,"APPROVE");
  expect((await get()).status).toBe("VERIFIED_EVIDENCE");
  expect((await iqac.session.api.post(record+"iqac-verify/", {decision:"APPROVE"}, {validateStatus: () => true})).status).toBe(400);
  expect(pageRows((await f.session.api.get("evidence/")).data).results.length).toBe(1);
  expect((await foreign.session.api.get(path, {validateStatus: () => true})).status).toBe(404);
  expect((await iqac.session.api.get(record)).data.logs.length).toBeGreaterThan(5);
}));

test("real HTTP: report formats, merge/handoffs, accreditation, requests, tasks and isolation", () => safe(async () => {
  const f = await actor("FACULTY"), inc = await actor("DEPARTMENT_INCHARGE"), hod = await actor("HOD"), iqac = await actor("IQAC"), manager = await actor("COLLEGE_MANAGEMENT"), foreign = await actor("FACULTY", true);
  for (const output_format of ["PDF","EXCEL","WORD"]) {
    const r = await f.ops.generate({report_type:fixture.report_type, output_format}) as {id:string;status:string;download_url:string};
    expect(r.status).toBe("COMPLETED");
    const b = await f.session.api.get(r.download_url, {responseType:"arraybuffer"});
    expect(Buffer.from(b.data).subarray(0, output_format === "PDF" ? 4 : 2).toString()).toBe(output_format === "PDF" ? "%PDF" : "PK");
    expect((await foreign.session.api.get(r.download_url,{validateStatus:()=>true})).status).toBe(404);
  }
  const facultyReport = await inc.ops.facultyReport(f.user.id) as {id:string};
  const merged = (await inc.session.api.post("reports/merge-reports/", {report_ids:[facultyReport.id]}, {headers:{"Idempotency-Key":"isolated-http-merge"}})).data;
  const replay = (await inc.session.api.post("reports/merge-reports/", {report_ids:[facultyReport.id]}, {headers:{"Idempotency-Key":"isolated-http-merge"}})).data;
  expect(replay.id).toBe(merged.id);
  await inc.ops.handoff(merged.id,"submit-to-hod"); await hod.ops.handoff(merged.id,"hod-download"); await hod.ops.handoff(merged.id,"submit-to-admins");
  for (const a of [iqac,manager]) expect((await a.session.api.get(`reports/${merged.id}/download/`,{responseType:"arraybuffer"})).status).toBe(200);
  for (const path of ["aqar/dashboard/","ssr/dashboard/","criteria/","metrics/","evidence-mappings/"])
    expect((await iqac.session.api.get(path)).status).toBe(200);
  const request = await inc.ops.request(f.user.id,"Disposable reporting period") as {id:string};
  await f.ops.respond(request.id,"Okay"); await f.ops.read(request.id); await f.ops.readAll();
  expect((await f.session.api.get("notifications/unread-count/")).data.unread_count).toBe(0);
  expect((await foreign.session.api.get(`notifications/${request.id}/`,{validateStatus:()=>true})).status).toBe(404);
  const task = await f.ops.saveTask({title:"Disposable task",owner:f.user.id}) as {id:string};
  await f.ops.task(task.id,"start",""); await f.ops.comment(task.id,"Progress"); await f.ops.task(task.id,"complete","");
  expect(pageRows((await f.session.api.get(`tasks/${task.id}/comments/`)).data).results.length).toBe(1);
  expect(pageRows((await f.session.api.get(`tasks/${task.id}/activities/`)).data).results.length).toBeGreaterThan(0);
  expect((await foreign.session.api.get(`tasks/${task.id}/`,{validateStatus:()=>true})).status).toBe(404);
  expect((await manager.session.api.post(`tasks/${task.id}/complete/`,{},{validateStatus:()=>true})).status).toBe(403);
}));
