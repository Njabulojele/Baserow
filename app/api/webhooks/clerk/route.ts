import { Webhook } from "svix";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  return new Response("Webhook endpoint is active. Use POST for webhooks.", {
    status: 200,
  });
}

export async function POST(req: Request) {
  // You can find this in the Clerk Dashboard -> Webhooks -> choose the webhook

  const WEBHOOK_SECRET = (
    process.env.CLERK_WEBHOOK_SIGNING_SECRET ||
    process.env.WEBHOOK_SECRET ||
    process.env.CLERK_WEBHOOK_SECRET ||
    ""
  ).trim();

  if (!WEBHOOK_SECRET) {
    console.error("Missing WEBHOOK_SECRET in .env");
    return new Response(
      "Please add WEBHOOK_SECRET from Clerk Dashboard to .env",
      {
        status: 500,
      },
    );
  }

  // Get svix headers from the request directly
  const svix_id = req.headers.get("svix-id");
  const svix_timestamp = req.headers.get("svix-timestamp");
  const svix_signature = req.headers.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.warn("Missing svix headers in request");
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // Get the body as raw text
  const body = await req.text();

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: any;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err: any) {
    console.error("❌ Webhook verification failed:", err.message);
    const errorBody = {
      error: "Verification failed",
      message: err.message,
      svix_id,
      svix_timestamp,
      has_signature: !!svix_signature,
      body_length: body?.length || 0,
      secret_prefix: WEBHOOK_SECRET.substring(0, 7),
    };
    return new Response(JSON.stringify(errorBody), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get the ID and type
  const { id } = evt.data;
  const eventType = evt.type;

  console.log(`Webhook with and ID of ${id} and type of ${eventType}`);
  // console.log('Webhook body:', body)

  if (eventType === "user.created" || eventType === "user.updated") {
    const { id, email_addresses, image_url, first_name, last_name } = evt.data;
    const email = email_addresses[0]?.email_address;
    const name = `${first_name || ""} ${last_name || ""}`.trim();

    if (!email) {
      return new Response("No email found", { status: 400 });
    }

    try {
      const displayName = name || email.split("@")[0];
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
    } catch (error) {
      console.error("Error syncing user:", error);
      return new Response("Error syncing user", { status: 500 });
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
        console.error("Error deleting user:", error);
        // If user not found, that's fine, ignore.
      }
    }
  }

  return new Response("", { status: 200 });
}
