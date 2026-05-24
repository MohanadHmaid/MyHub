const { Pool } = require("pg");

async function main() {
  console.log("Connecting to database using node pg...");
  const pool = new Pool({
    connectionString: "postgresql://postgres.efybfhxcszxrzgqcunhp:8MKbn0ffguDe4BV9@aws-1-eu-central-1.pooler.supabase.com:6543/postgres"
  });

  try {
    const client = await pool.connect();
    console.log("Connected successfully!");

    // Check if reservations table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'reservations'
      );
    `);
    console.log("Reservations table exists:", tableCheck.rows[0].exists);

    if (tableCheck.rows[0].exists) {
      // Query column details
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'reservations';
      `);
      console.log("Reservations table columns:");
      columns.rows.forEach(col => {
        console.log(` - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });

      // Query count of reservations
      const countRes = await client.query("SELECT COUNT(*) FROM reservations;");
      console.log("Total rows in reservations:", countRes.rows[0].count);

      // Fetch first 5 reservations
      const sample = await client.query("SELECT * FROM reservations LIMIT 5;");
      console.log("Sample reservations:", sample.rows);
    } else {
      console.log("Reservations table does NOT exist!");
    }

    client.release();
  } catch (error) {
    console.error("Database test error:", error);
  } finally {
    await pool.end();
  }
}

main();
