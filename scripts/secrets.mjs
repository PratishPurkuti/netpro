import {execFileSync} from 'node:child_process';
const names=execFileSync('git',['diff','--cached','--name-only','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
let failed=false;
for(const name of names){if(/(?:^|\/)(data|backups|node_modules|\.next)\/|\.env(?!\.example)|\.(?:db|sqlite|log)(?:$|-)/i.test(name)){console.error('Forbidden staged path:',name);failed=true;continue;}let content;try{content=execFileSync('git',['show',':'+name],{encoding:'utf8',maxBuffer:20e6});}catch{continue;}if(/(?:sk-[a-zA-Z0-9_-]{20,}|AIza[a-zA-Z0-9_-]{30,}|gh[pousr]_[a-zA-Z0-9]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|NETPRO_ENCRYPTION_KEY=[a-f0-9]{64})/.test(content)){console.error('Possible secret:',name);failed=true;}}
if(failed)process.exit(1);console.log('Staged secret and private-path checks passed ('+names.length+' files).');
