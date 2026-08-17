import { Webhook } from "svix";
import { prisma } from "../../lib/prisma";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req: any): Promise<string> {
  if (typeof req.body === "string") return req.body;
  if (req.body && Buffer.isBuffer(req.body)) return req.body.toString("utf-8");
  if (req.body && typeof req.body === "object") return JSON.stringify(req.body);

  return new Promise((resolve, reject) => {
    let chunks: any[] = [];
    req.on("data", (chunk: any) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", (err: any) => reject(err));
  });
}

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    return res.status(200).send("Webhook endpoint is active. Use POST for webhooks.");
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
    console.error("Missing WEBHOOK_SECRET in environment variables");
    return res.status(500).json({ error: "Missing WEBHOOK_SECRET" });
  }

  const svix_id = (req.headers["svix-id"] || req.headers["Svix-Id"]) as string;
  const svix_timestamp = (req.headers["svix-timestamp"] || req.headers["Svix-Timestamp"]) as string;
  const svix_signature = (req.headers["svix-signature"] || req.headers["Svix-Signature"]) as string;

  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.warn("Missing svix headers in request");
    return res.status(400).json({ error: "Missing svix headers" });
  }

  let body = "";
  try {
    body = await getRawBody(req);
  } catch (err: any) {
    console.error("Error reading raw body:", err);
    return res.status(400).json({ error: "Could not read request body" });
  }

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: any;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err: any) {
    console.error("❌ Webhook verification failed:", err.message);
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
    const email = email_addresses[0]?.email_address;
    const displayName =
      `${first_name || ""} ${last_name || ""}`.trim() ||
      email?.split("@")[0] ||
      "User";

    if (!email) {
      return res.status(400).json({ error: "No email found" });
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
      console.log(`User ${id} synced successfully via Clerk webhook`);
    } catch (error: any) {
      console.error("Error syncing user to database:", error);
      return res.status(500).json({ error: "Error syncing user to database" });
    }
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;
    if (id) {
      try {
        await prisma.user.delete({
          where: { id: id },
        });
        console.log(`User ${id} deleted successfully`);
      } catch (error) {
        // ignore if already deleted
      }
    }
  }

  return res.status(200).json({ success: true });
}
