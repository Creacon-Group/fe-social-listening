import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

/**
 * Issues a short-lived Vercel Blob token so the browser can upload large Excel files directly
 * (Vercel functions cap request bodies at 4.5 MB). Only signed-in ADMIN/ANALYST users get a token.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const me = await fetch(`${API_URL}/api/auth/me`, { headers: { cookie: request.headers.get("cookie") ?? "" } });
        if (!me.ok) throw new Error("Silakan masuk terlebih dahulu");
        const user = (await me.json()) as { role: string };
        if (user.role === "VIEWER") throw new Error("Akun viewer tidak bisa mengunggah data");
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
