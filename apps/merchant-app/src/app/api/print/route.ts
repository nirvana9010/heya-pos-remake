import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy for thermal printer requests.
 * Bypasses browser CORS/mixed-content restrictions by making
 * the HTTP call from Node.js where there are no browser restrictions.
 *
 * Body: { printerIp: string, endpoint?: string, payload?: object }
 *   - endpoint defaults to "/print"
 *   - payload is forwarded as JSON body (omit for GET requests like /status)
 */
export async function POST(request: NextRequest) {
  try {
    const { printerIp, endpoint, payload } = await request.json();

    if (!printerIp) {
      return NextResponse.json(
        { ok: false, error: "Missing printerIp" },
        { status: 400 }
      );
    }

    const path = endpoint || "/print";
    const url = `http://${printerIp}:9100${path}`;

    const isGet = path === "/status";
    const printerResponse = await fetch(url, {
      method: isGet ? "GET" : "POST",
      headers: isGet ? {} : { "Content-Type": "application/json" },
      body: isGet ? undefined : JSON.stringify(payload || {}),
      signal: AbortSignal.timeout(10_000),
    });

    const body = await printerResponse.text();

    return new NextResponse(body, {
      status: printerResponse.status,
      headers: { "Content-Type": printerResponse.headers.get("Content-Type") || "text/plain" },
    });
  } catch (error: any) {
    const message =
      error?.cause?.code === "ECONNREFUSED"
        ? "Printer not reachable. Check the IP address and that the print server is running."
        : error?.name === "TimeoutError"
          ? "Printer did not respond within 10 seconds."
          : error?.message || "Unknown print error";

    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
