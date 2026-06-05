import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { EXT_CONTENT_TYPE, UPLOAD_DIR, isSafeName } from "@/lib/uploads";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ name: string }> };

/** Streams a previously uploaded image from the local data directory. */
export async function GET(_req: Request, { params }: Ctx) {
  const { name } = await params;
  if (!isSafeName(name)) {
    return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
  }

  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const contentType = EXT_CONTENT_TYPE[ext];
  if (!contentType) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  try {
    const data = await fs.readFile(path.join(UPLOAD_DIR, name));
    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
