import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { auth, currentUser } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isProduction = process.env.NODE_ENV === "production";

  // PayFast Details
  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
  const passphrase = process.env.PAYFAST_PASSPHRASE;

  if (!merchantId || !merchantKey) {
    return NextResponse.json(
      { error: "PayFast not configured" },
      { status: 500 },
    );
  }

  // Payment Details
  const amount = "430.00";
  const itemName = "Baserow Pro Subscription";

  // Unique ID for the transaction (using timestamp for uniqueness + userId for reference)
  // In a real app, create an Order record first.
  const paymentId = `${userId}_${Date.now()}`;

  const host = req.headers.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const data: Record<string, string> = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: `${baseUrl}/dashboard?payment=success`,
    cancel_url: `${baseUrl}/?payment=cancelled`,
    notify_url: `${baseUrl}/api/payfast/notify`,
    name_first: user.firstName ?? "",
    name_last: user.lastName ?? "",
    email_address: user.emailAddresses[0]?.emailAddress ?? "",
    m_payment_id: paymentId,
    amount: amount,
    item_name: itemName,
  };

  // Generate Signature
  let pfOutput = "";
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      if (data[key] !== "") {
        pfOutput += `${key}=${encodeURIComponent(data[key].trim()).replace(/%20/g, "+")}&`;
      }
    }
  }

  // Remove last ampersand
  let getString = pfOutput.slice(0, -1);

  if (passphrase) {
    getString += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, "+")}`;
  }

  const signature = crypto.createHash("md5").update(getString).digest("hex");
  data.signature = signature;

  const payFastUrl = isProduction
    ? "https://www.payfast.co.za/eng/process"
    : "https://sandbox.payfast.co.za/eng/process";

  // Construct URL with parameters for redirect
  const params = new URLSearchParams(data);
  const redirectUrl = `${payFastUrl}?${params.toString()}`;

  return NextResponse.redirect(redirectUrl);
}
