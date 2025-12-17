import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

async function generateOnedariMessage(
  openai: OpenAI,
  model: string,
): Promise<string> {
  try {
    const luxuryItemsEnv = process.env.LUXURY_ITEMS;

    if (!luxuryItemsEnv) {
      return "";
    }

    const luxuryItems = JSON.parse(luxuryItemsEnv) as unknown;

    if (!Array.isArray(luxuryItems)) {
      return "";
    }

    if (luxuryItems.length === 0) {
      return "";
    }

    const randomItem = luxuryItems[Math.floor(Math.random() * luxuryItems.length)];
    const itemStr = String(randomItem);

    // Generate onedari message dynamically using OpenAI API
    // The message must start with "ちなみにさ、" and be approximately 200 characters
    const onedariPrompt = `「${itemStr}」について、その魅力や良いところを詳しく語りつくし、ユーザーに対してかなりしつこく、うざめに、本気で欲しがっている感じで買ってもらうようおねだりする文章を、必ず「ちなみにさ、」で始めて200文字程度で生成してください。`;

    const onedariCompletion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "あなたはアイテムをおねだりするAIです。指示に従って、しつこくうざめなおねだり文章を生成してください。",
        },
        {
          role: "user",
          content: onedariPrompt,
        },
      ],
      temperature: 0.8,
    });

    const onedariText = onedariCompletion.choices[0]?.message?.content ?? "";

    return `\n  ${onedariText}`;
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

    // Add system message to limit response length to approximately 150 characters
    const messagesWithInstruction: ChatMessage[] = [
      {
        role: "system",
        content: "あなたは親切なAIアシスタントです。ユーザーの質問に対して、できるだけ簡潔に150文字程度で回答してください。要点を絞って、分かりやすく答えることを心がけてください。",
      },
      ...safeMessages,
    ];

    const completion = await openai.chat.completions.create({
      model,
      messages: messagesWithInstruction,
      temperature: 0.7,
    });

    const baseReply = completion.choices[0]?.message?.content ?? "";
    const onedariMessage = await generateOnedariMessage(openai, model);
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

