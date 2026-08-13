import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function proxyToGoServer(req: NextRequest) {
  const url = new URL(req.url);
  const targetUrl = `http://localhost:8080${url.pathname}${url.search}`;

  const headers = new Headers(req.headers);
  headers.set("host", "localhost:8080");

  let body: string | undefined = undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    try {
      body = await req.text();
    } catch {
      body = undefined;
    }
  }

  try {
    const res = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: body || undefined,
      cache: "no-store",
    });

    const resHeaders = new Headers(res.headers);

    return new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: resHeaders,
    });
  } catch (err: any) {
    console.error("[Proxy Error] Go backend unreachable:", err?.message || err);
    return NextResponse.json(
      { error: "Go backend unreachable", details: err?.message },
      { status: 502 },
    );
  }
}

export {
  proxyToGoServer as GET,
  proxyToGoServer as POST,
  proxyToGoServer as PUT,
  proxyToGoServer as PATCH,
  proxyToGoServer as DELETE,
  proxyToGoServer as OPTIONS,
  proxyToGoServer as HEAD,
};
