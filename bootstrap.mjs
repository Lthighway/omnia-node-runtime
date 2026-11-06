import {mkdirSync,writeFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const diagnostics={
  sourceParts: Boolean(process.env.APP_SOURCE_PARTS||process.env.APP_SOURCE_BASE64),
  sourceDigest: Boolean(process.env.APP_SOURCE_SHA256),
  serviceAccount: Boolean(process.env.INTERCOM_SERVICE_ACCOUNT),
  mercadoPagoToken: Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN),
  mercadoPagoWebhook: Boolean(process.env.MERCADOPAGO_WEBHOOK_SECRET),
  firebasePush: Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS||process.env.INTERCOM_SERVICE_ACCOUNT)
};
console.log('OMNIA startup configuration presence (no secret values): '+JSON.stringify(diagnostics));

if(process.env.MERCADOPAGO_ACCESS_TOKEN){
  try {
    const r=await fetch('https://api.mercadopago.com/users/me',{
      headers:{Authorization:'Bearer '+process.env.MERCADOPAGO_ACCESS_TOKEN},
      signal:AbortSignal.timeout(8500)
    });
    const account=r.ok?await r.json():null;
    console.log('OMNIA payment credential preflight (no secret values): '+JSON.stringify({
      httpStatus:r.status,valid:r.ok,merchantMatches:account?String(account.id)==='363638713':false
    }));
  } catch(e) {
    console.log('OMNIA payment credential preflight unavailable: '+String(e?.name||'network'));
  }
}

const count=Number(process.env.APP_SOURCE_PARTS||0);
if(!Number.isSafeInteger(count)||count<0||count>16)throw new Error('Invalid source part count');
const encoded=count?Array.from({length:count},(_,index)=>process.env[`APP_SOURCE_${index}`]??'').join(''):process.env.APP_SOURCE_BASE64??'';
const source=Buffer.from(encoded,'base64');
if(!source.length||createHash('sha256').update(source).digest('hex')!==process.env.APP_SOURCE_SHA256)throw new Error('Application source missing or invalid');
const entry=join(process.cwd(),'.application','server.mjs');
mkdirSync(dirname(entry),{recursive:true});writeFileSync(entry,source,{mode:0o600});
process.argv[1]=entry;
await import(pathToFileURL(entry).href);
