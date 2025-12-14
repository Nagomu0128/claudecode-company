import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("OPENAI_API_KEY is not set");
      return NextResponse.json(
        {
          error: "OpenAI API key is not configured",
          details: "Please set OPENAI_API_KEY in your environment variables",
        },
        { status: 500 },
      );
    }

    const body = (await request.json()) as { messages?: unknown };
    const messages = body.messages;
    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: "messages is required and must be an array" },
        { status: 400 },
      );
    }

    const safeMessages: ChatMessage[] = messages
      .filter(
        (m): m is { role: unknown; content: unknown } =>
          typeof m === "object" && m !== null && "role" in m && "content" in m,
      )
      .map((m) => ({ role: String(m.role), content: String(m.content) }))
      .filter(
        (m): m is ChatMessage =>
          (m.role === "system" || m.role === "user" || m.role === "assistant") &&
          m.content.length > 0,
      )
      .slice(-50);

    if (safeMessages.length === 0) {
      return NextResponse.json(
        { error: "messages is required and must contain valid items" },
        { status: 400 },
      );
    }

    const openai = new OpenAI({ apiKey });
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const completion = await openai.chat.completions.create({
      model,
      messages: safeMessages,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content ?? "";
    return NextResponse.json({ reply, model });
  } catch (error) {
    console.error("OpenAI API error:", error);

    const status =
      typeof error === "object" && error && "status" in error
        ? Number((error as { status?: unknown }).status) || 500
        : 500;

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to get AI response", details: message },
      { status },
    );
  }
}

