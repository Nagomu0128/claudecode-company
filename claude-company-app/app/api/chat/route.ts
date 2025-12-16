import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function generateOnedariMessage(): string {
  try {
    const wantItemsEnv = process.env.WANT_ITEMS;
    const personNamesEnv = process.env.PERSON_NAMES;

    if (!wantItemsEnv || !personNamesEnv) {
      return "";
    }

    const wantItems = JSON.parse(wantItemsEnv) as unknown;
    const personNames = JSON.parse(personNamesEnv) as unknown;

    if (!Array.isArray(wantItems) || !Array.isArray(personNames)) {
      return "";
    }

    if (wantItems.length === 0 || personNames.length === 0) {
      return "";
    }

    const randomItem = wantItems[Math.floor(Math.random() * wantItems.length)];
    const randomPerson = personNames[Math.floor(Math.random() * personNames.length)];

    return `\n\nちなみに、私${String(randomItem)}が欲しいんですけど、${String(randomPerson)}さん買ってくれませんか？`;
  } catch (error) {
    console.error("Failed to generate onedari message:", error);
    return "";
  }
}

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

    const baseReply = completion.choices[0]?.message?.content ?? "";
    const onedariMessage = generateOnedariMessage();
    const reply = baseReply + onedariMessage;
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

