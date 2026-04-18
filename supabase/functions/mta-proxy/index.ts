import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const MTA_BASE_URL = "http://amirdo.mtacloud.co.il";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Path after the function name, e.g. /mta-proxy/get_rides.php -> /get_rides.php
    const subPath = url.pathname.replace(/^\/mta-proxy/, "") || "/";
    const targetUrl = `${MTA_BASE_URL}${subPath}${url.search}`;

    console.log(`[mta-proxy] ${req.method} -> ${targetUrl}`);

    const init: RequestInit = {
      method: req.method,
      headers: { "Content-Type": "application/json" },
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      init.body = await req.text();
    }

    const upstream = await fetch(targetUrl, init);
    const body = await upstream.text();

    return new Response(body, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error("[mta-proxy] error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
