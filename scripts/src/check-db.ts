import { db, reservationsTable } from "@workspace/db";

async function main() {
  console.log("Connecting to database and querying reservations table...");
  try {
    const reservations = await db.select().from(reservationsTable);
    console.log(`Success! Found ${reservations.length} reservations.`);
    if (reservations.length > 0) {
      console.log("First reservation:", reservations[0]);
    }
  } catch (error) {
    console.error("Error querying reservations table:", error);
  }
  process.exit(0);
}

main();
