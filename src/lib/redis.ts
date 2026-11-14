import { createClient } from "redis";

const client = createClient();
client.on("error", (err) => console.log("Redis Client Error", err));
await client.connect();

await client.set("bike:1", "Process 134");
const value = await client.get("bike:1");
console.log(value);
