"use server";

import { headers } from "next/headers";
import { authRateLimit } from "../rate-limit";

export async function verifyAuthAction(token: string) {
  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") ?? "127.0.0.1";

    // Check Upstash Rate Limit
    try {
      const { success } = await authRateLimit.limit(ip);
      if (!success) {
        return { error: "Too many requests. Please try again later." };
      }
    } catch (redisError) {
      console.warn(
        "Upstash Redis not configured properly, skipping rate limit.",
        redisError,
      );
    }

    // Verify Turnstile
    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    if (!secretKey) {
      console.warn(
        "Turnstile secret key not found. Skipping CAPTCHA verification.",
      );
      return { success: true };
    }

    if (!token) {
      return { error: "Please complete the CAPTCHA." };
    }

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${secretKey}&response=${token}`,
      },
    );

    const data = await res.json();
    if (!data.success) {
      return { error: "CAPTCHA verification failed. Please try again." };
    }

    return { success: true };
  } catch (error) {
    console.error("Auth verification error:", error);
    return { error: "An unexpected error occurred." };
  }
}
