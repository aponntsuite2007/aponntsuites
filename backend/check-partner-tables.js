const { Client } = require('pg');
require('dotenv').config();

(async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost')
      ? false
      : { rejectUnauthorized: false }
  });

  await client.connect();

  const tables = [
    'partner_roles',
    'partners',
    'partner_documents',
    'partner_notifications',
    'partner_availability',
    'partner_service_requests'
  ];

  for (const table of tables) {
    const result = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [table]);

    console.log(`\n${table}: ${result.rowCount} columns`);
    console.log(result.rows.map(r => r.column_name).join(', '));
  }

  await client.end();
})().catch(e => console.error('ERROR:', e.message));
