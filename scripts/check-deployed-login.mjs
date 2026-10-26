// Read-only account verification, except creating/revoking its own login session.
import assert from 'node:assert/strict';
const origin=process.argv[2];assert.equal(origin,'https://nimani-customer-studio.arlindmanaj.chatgpt.site');
if(process.stdin.isTTY)process.stdin.setRawMode(true);process.stderr.write('Ready for login JSON on hidden stdin.\n');process.stdin.setEncoding('utf8');
const credentials=await new Promise(resolve=>{let text='';process.stdin.on('data',chunk=>{text+=chunk;if(text.includes('\u0003'))process.exit(130);if(/[\r\n]/.test(text)){process.stdin.pause();if(process.stdin.isTTY)process.stdin.setRawMode(false);resolve(JSON.parse(text.trim()));}});});
const anon=await fetch(origin+'/api/studio');assert.equal(anon.status,401);
const login=await fetch(origin+'/api/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({action:'login',...credentials})});assert.equal(login.status,200,'Live administrator login failed');
const cookieHeaders=login.headers.getSetCookie();assert(cookieHeaders.some(v=>v.startsWith('__Host-nimani-session=')&&/; Secure/i.test(v)&&/; HttpOnly/i.test(v)),'Hosted session must be Secure and HttpOnly');
const cookie=cookieHeaders.map(v=>v.split(';')[0]).join('; ');const session=await login.json();assert.equal(session.user.role,'admin');
const staff=await fetch(origin+'/api/staff',{headers:{Cookie:cookie}});assert.equal(staff.status,200);
const data=await staff.json();assert(data.staff.some(s=>s.email===credentials.email&&s.active&&s.role==='admin'));assert(!JSON.stringify(data).includes('password_hash'));
const records=await fetch(origin+'/api/studio',{headers:{Cookie:cookie}});assert.equal(records.status,200);await records.arrayBuffer();
await fetch(origin+'/api/session',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});assert.equal((await fetch(origin+'/api/studio',{headers:{Cookie:cookie}})).status,401);
console.log('Live verification passed: anonymous records blocked, configured administrator exists and signs in, Secure/HttpOnly hosted session, staff management allowed, store records accessible, logout revokes access. No customer data was modified.');
