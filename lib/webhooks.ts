import { withTenant } from "./prisma";
import crypto from "crypto";

export type WebhookEvent =
  | "task.created"
  | "task.updated"
  | "task.deleted"
  | "project.created"
  | "project.updated"
  | "project.deleted";

/**
 * Dispatches a webhook event to all active endpoints registered by the tenant
 * that are subscribed to the specified event.
 */
export async function dispatchWebhook(
  organizationId: string | null | undefined,
  event: WebhookEvent,
  payload: any,
) {
  // Webhooks only apply to requests operating within an organization context
  if (!organizationId) return;

  try {
    // 1. Find all active webhooks for this org that are listening to this event
    // We use withTenant to ensure strict isolation
    await withTenant(organizationId, async (prisma) => {
      const endpoints = await prisma.webhookEndpoint.findMany({
        where: {
          organizationId,
          isActive: true,
          events: {
            has: event,
          },
        },
      });

      if (endpoints.length === 0) return;

      const payloadString = JSON.stringify(payload);

      // 2. Dispatch to each endpoint concurrently
      await Promise.all(
        endpoints.map(async (endpoint) => {
          const startTime = Date.now();
          let status = 0;
          let successful = false;

          // Create HMAC signature using the endpoint secret
          const signature = crypto
            .createHmac("sha256", endpoint.secret)
            .update(payloadString)
            .digest("hex");

          try {
            const response = await fetch(endpoint.url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-webhook-event": event,
                "x-webhook-signature": signature,
                "user-agent": "ProductiveYou-Webhooks/1.0",
              },
              body: payloadString,
            });

            status = response.status;
            successful = response.ok;
          } catch (error) {
            // fetch throws on network errors (e.g. DNS failure, connection refused)
            console.error(
              `Webhook delivery failure to ${endpoint.url}:`,
              error,
            );
            status = 500;
          }

          const duration = Date.now() - startTime;

          // 3. Log the delivery
          await prisma.webhookDelivery.create({
            data: {
              webhookEndpointId: endpoint.id,
              event,
              payload,
              status,
              successful,
              duration,
            },
          });
        }),
      );
    });
  } catch (error) {
    console.error("Error dispatching webhooks:", error);
  }
}
