const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ALLOWED_QUERY_PARAMETERS = new Set(["state", "region", "since", "until", "page"]);
const UPSTREAM_TIMEOUT_MS = 10_000;

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "GET, OPTIONS" },
      });
    }

    const url = new URL(req.url);
    const apiKey = Deno.env.get("FBI_CRIME_API_KEY");

    if (!apiKey) {
      console.error("FBI_CRIME_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Crime data service is unavailable" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Keep the API key on the server and only proxy the endpoint and parameters
    // required by this application. This prevents use as an arbitrary API proxy.
    const params = new URLSearchParams();
    params.append("api_key", apiKey);

    for (const [key, value] of url.searchParams.entries()) {
      if (ALLOWED_QUERY_PARAMETERS.has(key) && value) {
        params.append(key, value);
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    const apiUrl = `https://api.usa.gov/crime/fbi/cde/data?${params.toString()}`;

    let response: Response;
    try {
      response = await fetch(apiUrl, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      console.error("FBI crime API returned", response.status);
      return new Response(JSON.stringify({ error: "Crime data service is unavailable" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.text();

    return new Response(data, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Unable to retrieve crime data" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
