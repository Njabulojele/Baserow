const { Webhook } = require("svix");
const { PrismaClient } = require("@prisma/client");

let prisma;
if (global.prisma) {
  prisma = global.prisma;
} else {
  prisma = new PrismaClient();
  if (process.env.NODE_ENV !== "production") {
    global.prisma = prisma;
  }
}

function parseBody(req) {
  if (typeof req.body === "string") return req.body;
  if (req.body && Buffer.isBuffer(req.body)) return req.body.toString("utf-8");
  if (req.body && typeof req.body === "object") return JSON.stringify(req.body);
  return "";
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      return res
        .status(200)
        .send("Webhook endpoint is active. Use POST for webhooks.");
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const WEBHOOK_SECRET = (
      process.env.CLERK_WEBHOOK_SIGNING_SECRET ||
      process.env.WEBHOOK_SECRET ||
      process.env.CLERK_WEBHOOK_SECRET ||
      ""
    ).trim();

    if (!WEBHOOK_SECRET) {
      console.warn("⚠️ WEBHOOK_SECRET is missing in Vercel environment variables");
      return res.status(200).json({
        status: "ignored",
        message: "Missing WEBHOOK_SECRET in environment variables",
      });
    }

    const svix_id = req.headers["svix-id"] || req.headers["Svix-Id"];
    const svix_timestamp = req.headers["svix-timestamp"] || req.headers["Svix-Timestamp"];
    const svix_signature = req.headers["svix-signature"] || req.headers["Svix-Signature"];

    if (!svix_id || !svix_timestamp || !svix_signature) {
      console.warn("⚠️ Missing svix headers in request");
      return res.status(400).json({ error: "Missing svix headers" });
    }

    const body = parseBody(req);
    const wh = new Webhook(WEBHOOK_SECRET);
    let evt;

    try {
      evt = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      });
    } catch (err) {
      console.error("❌ Svix signature verification failed:", err.message);
      return res.status(400).json({
        error: "Verification failed",
        message: err.message,
      });
    }

    const { id } = evt.data;
    const eventType = evt.type;

    console.log(`Webhook received: ID ${id}, Type ${eventType}`);

    if (eventType === "user.created" || eventType === "user.updated") {
      const { id, email_addresses, image_url, first_name, last_name } = evt.data;
      const email =
        email_addresses && email_addresses[0]
          ? email_addresses[0].email_address
          : null;
      const displayName =
        `${first_name || ""} ${last_name || ""}`.trim() ||
        (email ? email.split("@")[0] : "User");

      if (!email) {
        return res.status(400).json({ error: "No email found in event data" });
      }

      try {
        const existingById = await prisma.user.findUnique({
          where: { id: id },
        });
        if (existingById) {
          await prisma.user.update({
            where: { id: id },
            data: { email, name: displayName, avatar: image_url },
          });
        } else {
          const existingByEmail = await prisma.user.findUnique({
            where: { email },
          });
          if (existingByEmail) {
            await prisma.user.update({
              where: { email },
              data: { id: id, name: displayName, avatar: image_url },
            });
          } else {
            await prisma.user.create({
              data: {
                id: id,
                email,
                name: displayName,
                avatar: image_url,
                timezone: "Africa/Johannesburg",
              },
            });
          }
        }
        console.log(`✅ User ${id} synced successfully to Neon database`);
      } catch (error) {
        console.error("❌ Error syncing user to Neon database:", error);
      }
    }

    if (eventType === "user.deleted") {
      const { id } = evt.data;
      if (id) {
        try {
          await prisma.user.delete({
            where: { id: id },
          });
          console.log(`✅ User ${id} deleted from Neon database`);
        } catch (error) {
          // ignore if already deleted
        }
      }
    }

    return res.status(200).json({ success: true });
  } catch (globalErr) {
    console.error("💥 Unhandled error in Clerk webhook handler:", globalErr);
    return res.status(200).json({
      status: "error_handled",
      message: globalErr ? globalErr.message : "Internal server error handled",
    });
  }
};
