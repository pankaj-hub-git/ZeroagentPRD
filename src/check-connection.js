import { supabase } from "./supabase-client.js";

async function checkConnection() {
  console.log("Checking Supabase connection...\n");
  console.log(`URL: ${process.env.SUPABASE_URL}\n`);

  try {
    // Use a lightweight query to verify the connection is working.
    // auth.getSession() hits the Supabase Auth endpoint without
    // requiring any database tables to exist.
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error("Connection FAILED:", error.message);
      process.exit(1);
    }

    console.log("Connection SUCCESSFUL");
    console.log("Auth endpoint is reachable and responding.");
    console.log("Session data:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Connection FAILED:", err.message);
    process.exit(1);
  }
}

checkConnection();
