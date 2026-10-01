exports.up=async function(db){
 await db.schema.createTable('owner',t=>{t.integer('id').primary();t.string('username').notNullable();t.text('password').notNullable();t.text('profile').notNullable();});
 await db.schema.createTable('sessions',t=>{t.string('id').primary();t.bigInteger('expires').notNullable();});
 await db.schema.createTable('contacts',t=>{t.string('id').primary();t.text('record').notNullable();});
 await db.schema.createTable('conversations',t=>{t.string('id').primary();t.string('title').notNullable();t.text('messages').notNullable();t.bigInteger('updated').notNullable();});
 await db.schema.createTable('settings',t=>{t.integer('id').primary();t.text('record').notNullable();});
 await db.schema.createTable('attempts',t=>{t.string('id').primary();t.integer('count').notNullable();t.bigInteger('until').notNullable();});
};
exports.down=async function(db){for(const name of ['attempts','settings','conversations','contacts','sessions','owner'])await db.schema.dropTableIfExists(name);};
