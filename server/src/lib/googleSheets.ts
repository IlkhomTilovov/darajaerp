import { createSign } from "node:crypto";

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

const base64url = (input: Buffer | string) =>
  (Buffer.isBuffer(input) ? input : Buffer.from(input)).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

async function getAccessToken(serviceAccountKey: ServiceAccountKey) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccountKey.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const signatureInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signatureInput);
  const signature = signer.sign(serviceAccountKey.private_key);
  const jwt = `${signatureInput}.${base64url(signature)}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResponse.ok) {
    throw new Error(`Failed to get access token: ${await tokenResponse.text()}`);
  }

  return tokenResponse.json() as Promise<{ access_token: string }>;
}

export async function appendToSheet(spreadsheetId: string, range: string, values: unknown[][]) {
  const serviceAccountKeyStr = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKeyStr) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY not configured");

  const serviceAccountKey = JSON.parse(serviceAccountKeyStr) as ServiceAccountKey;
  const { access_token } = await getAccessToken(serviceAccountKey);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  });

  if (!response.ok) {
    throw new Error(`Failed to append to sheet: ${await response.text()}`);
  }

  return response.json();
}
