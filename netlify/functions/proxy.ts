import { Handler } from "@netlify/functions";
import axios from "axios";

export const handler: Handler = async (event) => {
  const url = event.queryStringParameters?.url;

  if (!url) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "URL is required" }),
    };
  }

  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 10000,
    });

    return {
      statusCode: 200,
      body: response.data,
    };
  } catch (error: any) {
    console.error("Proxy error:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Failed to fetch URL: ${error.message}` }),
    };
  }
};
