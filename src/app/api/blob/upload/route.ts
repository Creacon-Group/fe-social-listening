import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

/**
 * Issues a short-lived Vercel Blob token so the browser can upload large Excel files directly
 * (Vercel functions cap request bodies at 4.5 MB). Only users with data.upload in the project get a token.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const projectId = Number(clientPayload);
        if (!Number.isInteger(projectId)) throw new Error("Missing project");
        const res = await fetch(`${API_URL}/api/projects/${projectId}/access`, {
          headers: { cookie: request.headers.get("cookie") ?? "" },
        });
        if (res.status === 401) throw new Error("Sign in first");
        if (!res.ok) throw new Error("You don't have access to this project");
        const access = (await res.json()) as { permissions: string[] };
        if (!access.permissions.includes("data.upload")) throw new Error("Your access doesn't include uploading data");
        return {
          allowedContentTypes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
          maximumSizeInBytes: 200 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
