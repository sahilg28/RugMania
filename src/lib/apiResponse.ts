import { NextResponse } from "next/server";

export function jsonOk<T extends Record<string, unknown>>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, ...data }, init);
}

export function jsonError<T extends Record<string, unknown> = Record<string, never>>(params: {
  message: string;
  status: number;
  code?: string;
  data?: T;
  headers?: HeadersInit;
}) {
  const body: Record<string, unknown> = {
    ok: false,
    error: params.message,
    errorDetails: {
      code: params.code ?? "ERROR",
      message: params.message,
    },
  };

  if (params.data) {
    Object.assign(body, params.data);
  }

  return NextResponse.json(body, { status: params.status, headers: params.headers });
}
