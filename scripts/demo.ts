import {db,ready,owner} from '../lib/db';
import {demoContacts} from '../lib/demo';
await ready();
if(!await owner())throw new Error('Create the owner account in the browser first.');
if(process.argv.includes('--reset')){
 if(!process.argv.includes('--confirm-demo-only'))throw new Error('Reset requires --confirm-demo-only. It deletes ONLY the six fixed demo IDs.');
 await db('contacts').whereIn('id',demoContacts.map(c=>c.id)).delete();
}
if(await db('contacts').first()&&!process.argv.includes('--allow-mixed'))throw new Error('Database has contacts. To intentionally mix demo data, pass --allow-mixed.');
await db.transaction(async trx=>{for(const c of demoContacts)await trx('contacts').insert({id:c.id,record:JSON.stringify(c)}).onConflict('id').ignore();});
console.log('Six synthetic demo contacts added.');await db.destroy();
