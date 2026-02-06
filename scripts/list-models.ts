import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";

dotenv.config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY not found in .env");
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    // Note: The SDK might not have a direct 'listModels' in the top-level genAI instance
    // depending on the version, but we can try to fetch it via the REST API or
    // check if it's available in the client.

    console.log(
      "Fetching models with API Key:",
      apiKey.substring(0, 5) + "...",
    );

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    );
    const data = await response.json();

    if (data.error) {
      console.error("API Error:", data.error);
      return;
    }

    console.log("\nAvailable Models:");
    console.log("-----------------");
    data.models?.forEach((model: any) => {
      console.log(`Model: ${model.name}`);
      console.log(`Display Name: ${model.displayName}`);
      console.log(`Methods: ${model.supportedGenerationMethods.join(", ")}`);
      console.log("-----------------");
    });
  } catch (error) {
    console.error("Error listing models:", error);
  }
}

listModels();
