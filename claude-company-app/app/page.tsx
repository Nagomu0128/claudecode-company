"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const STORAGE_KEY = "chat-history";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as unknown;
      if (Array.isArray(parsed)) {
        setMessages(
          parsed
            .filter(
              (m): m is { role: unknown; content: unknown } =>
                typeof m === "object" && m !== null && "role" in m && "content" in m,
            )
            .map((m) => ({ role: String(m.role), content: String(m.content) }))
            .filter(
              (m): m is Message =>
                (m.role === "user" || m.role === "assistant") && m.content.length > 0,
            ),
        );
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, errorText]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    setErrorText(null);

    const userMessage: Message = { role: "user", content: input.trim() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { reply?: unknown; error?: unknown; details?: unknown }
        | null;

      if (!response.ok) {
        const details =
          payload && (payload.details ?? payload.error)
            ? String(payload.details ?? payload.error)
            : `HTTP ${response.status}`;
        throw new Error(details);
      }

      const reply = payload?.reply ? String(payload.reply) : "";
      setMessages([...nextMessages, { role: "assistant", content: reply || "（空の応答）" }]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "不明なエラーが発生しました";
      setErrorText(message);
      setMessages([
        ...nextMessages,
        { role: "assistant", content: "エラーが発生しました。設定とログを確認してください。" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (!confirm("会話履歴をクリアしますか？")) return;
    setMessages([]);
    setErrorText(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-900">
      <header className="border-b border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            おねだりしてくるAIチャット
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearHistory}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              履歴クリア
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          {errorText && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              APIエラー: {errorText}
            </div>
          )}

          {messages.length === 0 && (
            <div className="text-center text-zinc-500 dark:text-zinc-400">
              メッセージを送信して会話を始めましょう。
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg bg-white px-4 py-3 dark:bg-zinc-800">
                <p className="text-zinc-500 dark:text-zinc-400">AIが応答中...</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="border-t border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-col gap-2 sm:flex-row">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="メッセージを入力（Enterで送信 / Shift+Enterで改行）"
              disabled={isLoading}
              rows={2}
              className="min-h-[44px] w-full flex-1 resize-none rounded-lg border border-zinc-300 px-4 py-3 text-zinc-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-zinc-100 disabled:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-blue-400 dark:disabled:bg-zinc-800"
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="h-[44px] rounded-lg bg-blue-600 px-6 font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-500"
            >
              送信
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

