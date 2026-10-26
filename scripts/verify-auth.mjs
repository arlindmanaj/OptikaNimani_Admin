import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
const origin=process.argv[2]||'http://127.0.0.1:5173';
assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname),'Local verification only');
if(process.stdin.isTTY)process.stdin.setRawMode(true);process.stderr.write('Ready for admin login JSON on hidden stdin.\n');process.stdin.setEncoding('utf8');
const credentials=await new Promise((resolve,reject)=>{let text='';process.stdin.on('data',chunk=>{text+=chunk;if(text.includes('\u0003'))process.exit(130);if(text.length>4096)reject(new Error('Input too large'));if(/[\r\n]/.test(text)){process.stdin.pause();if(process.stdin.isTTY)process.stdin.setRawMode(false);resolve(JSON.parse(text.trim()));}});});
let checks=0;function check(v,label){assert(v,label);checks++;console.log('PASS '+label);}
async function req(path,body,cookie='',expected=200){const r=await fetch(origin+path,{method:body?'POST':'GET',headers:{...(cookie?{Cookie:cookie}:{}),...(body?{Origin:origin,'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json();assert.equal(r.status,expected,d.error||'Unexpected response');return {d,cookie:r.headers.getSetCookie().map(v=>v.split(';')[0]).join('; '),headers:r.headers};}
const initialPage=await fetch(origin+'/',{redirect:'manual'});check(initialPage.status===307&&initialPage.headers.get('location')==='/login','Anonymous page access redirects to the login page');
await req('/api/studio',null,'',401);await req('/api/staff',null,'',401);check(true,'Anonymous records and staff APIs are protected');
check((await fetch(origin+'/api/studio',{headers:{Cookie:'__sites_local_auth=1','oai-authenticated-user-id':'pretend','oai-authenticated-user-email':'pretend@example.com'}})).status===401,'Legacy ChatGPT headers cannot bypass staff sign-in');
await req('/api/session',{action:'login',...credentials,password:'incorrect-password'},'',401);
const login=await req('/api/session',{action:'login',...credentials});let adminCookie=login.cookie;
check(login.d.user.role==='admin'&&login.d.user.email===credentials.email,'The configured Optika Nimani account is an administrator');
check(/HttpOnly/i.test(login.headers.get('set-cookie'))&&/SameSite=Lax/i.test(login.headers.get('set-cookie')),'Sessions use an HttpOnly SameSite cookie');
const list=await req('/api/staff',null,adminCookie);check(!JSON.stringify(list.d).includes('password_hash')&&!JSON.stringify(list.d).includes('scrypt-v1'),'Staff API never returns password hashes');
const generated=()=>randomBytes(18).toString('base64url'),staffPass=generated(),email=`fixture-${Date.now()}@example.com`;
const created=await req('/api/staff',{action:'create',name:'Local staff fixture',email,password:staffPass,role:'staff'},adminCookie,201),staffId=created.d.id;
await req('/api/staff',{action:'create',name:'Duplicate',email,password:staffPass,role:'staff'},adminCookie,409);check(true,'Administrators create staff and duplicate emails are rejected');
let employee=await req('/api/session',{action:'login',email,password:staffPass}),employeeCookie=employee.cookie;
const a=await req('/api/studio',null,adminCookie),b=await req('/api/studio',null,employeeCookie);check(a.d.customers.length===b.d.customers.length,'Staff and admin see the same existing store records');
await req('/api/staff',null,employeeCookie,403);await req('/api/staff',{action:'toggle',id:login.d.user.id,active:false},employeeCookie,403);check(true,'Staff cannot read or mutate account administration');
await req('/api/studio',null,employeeCookie+'tampered',401);check(true,'Modified session tokens are rejected');
await req('/api/staff',{action:'toggle',id:login.d.user.id,active:false},adminCookie,400);check(true,'Administrators cannot deactivate their own account');
await req('/api/staff',{action:'toggle',id:staffId,active:false},adminCookie);await req('/api/studio',null,employeeCookie,401);await req('/api/session',{action:'login',email,password:staffPass},'',401);check(true,'Deactivation immediately revokes sessions and blocks login');
await req('/api/staff',{action:'toggle',id:staffId,active:true},adminCookie);await req('/api/studio',null,employeeCookie,401);employee=await req('/api/session',{action:'login',email,password:staffPass});employeeCookie=employee.cookie;check(true,'Reactivation requires a fresh sign-in');
const reset=generated();await req('/api/staff',{action:'resetPassword',id:staffId,password:reset},adminCookie);await req('/api/studio',null,employeeCookie,401);await req('/api/session',{action:'login',email,password:staffPass},'',401);employeeCookie=(await req('/api/session',{action:'login',email,password:reset})).cookie;check(true,'Password reset invalidates old credentials and sessions');
const newPass=generated();await req('/api/session',{action:'changePassword',currentPassword:'wrong',password:newPass},employeeCookie,400);await req('/api/session',{action:'changePassword',currentPassword:reset,password:newPass},employeeCookie);await req('/api/studio',null,employeeCookie,401);employeeCookie=(await req('/api/session',{action:'login',email,password:newPass})).cookie;check(true,'Staff can change their password and all prior sessions are revoked');
await req('/api/session',{action:'logout'},employeeCookie);await req('/api/studio',null,employeeCookie,401);check(true,'Sign out invalidates the session server-side');
const badEmail=`rate-${Date.now()}@example.com`;for(let i=0;i<10;i++)await req('/api/session',{action:'login',email:badEmail,password:'incorrect-password'},'',401);await req('/api/session',{action:'login',email:badEmail,password:'incorrect-password'},'',429);check(true,'Repeated failed sign-in attempts are throttled');
await req('/api/staff',{action:'toggle',id:staffId,active:false},adminCookie);
// Run existing record checks using a real, in-memory staff session.
process.env.NIMANI_TEST_COOKIE=adminCookie;await import('./verify-studio.mjs');
await req('/api/session',{action:'logout'},adminCookie);await req('/api/studio',null,adminCookie,401);
console.log(`\n${checks} authentication checks passed. Local test staff were deactivated.`);
