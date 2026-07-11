const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CrimeQuery {
  state?: string;
  region?: string;
  since?: number;
  until?: number;
  page?: number;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint") || "data";
    const apiKey = Deno.env.get("FBI_CRIME_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "FBI API key not configured" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Build query parameters
    const params = new URLSearchParams();
    params.append("api_key", apiKey);

    const query: CrimeQuery = {};
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== "endpoint" && value) {
        params.append(key, value);
        query[key as keyof CrimeQuery] = isNaN(Number(value)) ? value : Number(value);
      }
    }

    const apiUrl = `https://api.usa.gov/crime/fbi/cde/${endpoint}?${params.toString()}`;

    const response = await fetch(apiUrl);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
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