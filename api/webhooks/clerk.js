import { createHmac } from "crypto";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function verifySignature(body, svixId, svixTimestamp, svixSignature, secret) {
  try {
    const secretBytes = Buffer.from(secret.replace("whsec_", ""), "base64");
    const toSign = `${svixId}.${svixTimestamp}.${body}`;
    const hmac = createHmac("sha256", secretBytes);
    hmac.update(toSign);
    const expected = hmac.digest("base64");

    const signatures = svixSignature.split(" ");
    for (const sig of signatures) {
      const [version, value] = sig.split(",");
      if (version === "v1" && value === expected) {
        return true;
      }
    }
    return false;
  } catch (err) {
    console.error("Signature verification error:", err.message);
    return false;
  }
}

function getBody(req) {
  if (typeof req.body === "string") return req.body;
  if (req.body && Buffer.isBuffer(req.body)) return req.body.toString("utf-8");
  if (req.body && typeof req.body === "object") return JSON.stringify(req.body);
  return "";
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      return res.status(200).send("Clerk webhook endpoint active. Use POST.");
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const secret = (
      process.env.CLERK_WEBHOOK_SIGNING_SECRET ||
      process.env.WEBHOOK_SECRET ||
      process.env.CLERK_WEBHOOK_SECRET ||
      ""
    ).trim();

    if (!secret) {
      console.warn(
        "⚠️ CLERK_WEBHOOK_SIGNING_SECRET not set in Vercel env vars",
      );
      return res.status(200).json({ status: "ignored", reason: "no_secret" });
    }

    const svixId = req.headers["svix-id"];
    const svixTimestamp = req.headers["svix-timestamp"];
    const svixSignature = req.headers["svix-signature"];

    if (!svixId || !svixTimestamp || !svixSignature) {
      return res.status(400).json({ error: "Missing svix headers" });
    }

    const body = getBody(req);

    const valid = verifySignature(
      body,
      svixId,
      svixTimestamp,
      svixSignature,
      secret,
    );
    if (!valid) {
      console.error("❌ Invalid webhook signature");
      return res.status(400).json({ error: "Invalid signature" });
    }

    const evt = JSON.parse(body);
    const eventType = evt.type;
    const data = evt.data;

    console.log(`✅ Webhook verified: type=${eventType}, id=${data.id}`);

    if (eventType === "user.created" || eventType === "user.updated") {
      const userId = data.id;
      const email = data.email_addresses?.[0]?.email_address;
      const firstName = data.first_name || "";
      const lastName = data.last_name || "";
      const displayName =
        `${firstName} ${lastName}`.trim() ||
        (email ? email.split("@")[0] : "User");
      const avatar = data.image_url || null;

      if (!email) {
        console.warn("No email in event, skipping sync");
        return res.status(200).json({ status: "skipped", reason: "no_email" });
      }

      try {
        const client = await pool.connect();
        try {
          // Check by id first
          const byId = await client.query(
            "SELECT id FROM users WHERE id = $1 LIMIT 1",
            [userId],
          );
          if (byId.rows.length > 0) {
            await client.query(
              "UPDATE users SET email=$1, name=$2, avatar=$3 WHERE id=$4",
              [email, displayName, avatar, userId],
            );
          } else {
            // Check by email
            const byEmail = await client.query(
              "SELECT id FROM users WHERE email = $1 LIMIT 1",
              [email],
            );
            if (byEmail.rows.length > 0) {
              await client.query(
                "UPDATE users SET id=$1, name=$2, avatar=$3 WHERE email=$4",
                [userId, displayName, avatar, email],
              );
            } else {
              await client.query(
                "INSERT INTO users (id, email, name, avatar, timezone, created_at) VALUES ($1,$2,$3,$4,$5,NOW())",
                [userId, email, displayName, avatar, "Africa/Johannesburg"],
              );
            }
          }
          console.log(`✅ User ${userId} synced to Neon`);
        } finally {
          client.release();
        }
      } catch (dbErr) {
        console.error("❌ DB sync error:", dbErr.message);
      }
    }

    if (eventType === "user.deleted") {
      const userId = data.id;
      if (userId) {
        try {
          const client = await pool.connect();
          try {
            await client.query("DELETE FROM users WHERE id = $1", [userId]);
            console.log(`✅ User ${userId} deleted from Neon`);
          } finally {
            client.release();
          }
        } catch (dbErr) {
          console.error("❌ DB delete error:", dbErr.message);
        }
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("💥 Webhook handler error:", err.message);
    return res
      .status(200)
      .json({ status: "error_handled", message: err.message });
  }
}
