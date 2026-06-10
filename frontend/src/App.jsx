import { useState, useRef, useEffect } from "react";

const SUGGESTIONS = [
  "What is the interest rate on this loan?",
  "What are the total closing costs?",
  "What is the monthly payment?",
  "Are there any prepayment penalties?",
  "What documents are required?",
];

const API_BASE = import.meta.env.VITE_API_URL || "";

function SourcePill({ src }) {
  const name = src.split("/").pop().replace(".pdf", "");
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, padding: "3px 10px", borderRadius: 20,
      background: "#f0f4ff", border: "0.5px solid #c7d4f5",
      color: "#3c5299", fontWeight: 500,
    }}>
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        <path d="M4 2h6l4 4v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#3c5299" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M10 2v4h4" stroke="#3c5299" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
      {name}
    </span>
  );
}

function ThinkingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center", padding: "4px 0" }}>
      {[0, 150, 300].map((delay, i) => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: "50%",
          background: "#888", display: "inline-block",
          animation: `lqdot 1.4s ease-in-out ${delay}ms infinite`,
        }} />
      ))}
      <style>{`@keyframes lqdot{0%,80%,100%{transform:translateY(0);opacity:.3}40%{transform:translateY(-4px);opacity:1}}`}</style>
    </span>
  );
}

function Message({ msg, isLast }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex", gap: 12,
      flexDirection: isUser ? "row-reverse" : "row",
      alignItems: "flex-start",
      animation: isLast ? "fadein 0.25s ease" : "none",
    }}>
      <style>{`@keyframes fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{
        width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 600,
        background: isUser ? "#e8f0fe" : "#f5f0ff",
        color: isUser ? "#1a56db" : "#6c47c9",
        border: `0.5px solid ${isUser ? "#c2d4fb" : "#d9cef7"}`,
      }}>
        {isUser ? "You" : "AI"}
      </div>

      <div style={{ maxWidth: "76%", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{
          padding: "10px 14px",
          borderRadius: isUser ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
          background: isUser ? "#1a56db" : "#fafafa",
          border: isUser ? "none" : "0.5px solid #e5e7eb",
          fontSize: 14, lineHeight: 1.65,
          color: isUser ? "#fff" : "#111",
        }}>
          {msg.thinking ? <ThinkingDots /> : msg.content}
        </div>

        {msg.sources?.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingLeft: 2 }}>
            {msg.sources.map((s, i) => <SourcePill key={i} src={s} />)}
          </div>
        )}

        {msg.ms && (
          <span style={{ fontSize: 11, color: "#aaa", paddingLeft: 2 }}>
            {msg.ms}ms · RAG retrieval
          </span>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([{
    role: "assistant",
    content: "Hi! I can answer questions about your loan documents — interest rates, closing costs, payment schedules, and more. What would you like to know?",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const hasAsked = messages.some(m => m.role === "user");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submit = async (question) => {
    if (!question.trim() || loading) return;
    setInput("");
    setLoading(true);

    const thinking = { role: "assistant", thinking: true };
    setMessages(prev => [...prev, { role: "user", content: question }, thinking]);

    try {
      const res = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setMessages(prev => [...prev.slice(0, -1), {
        role: "assistant",
        content: data.answer,
        sources: data.sources || [],
        ms: Math.round(data.response_time_ms),
      }]);
    } catch (err) {
      setMessages(prev => [...prev.slice(0, -1), {
        role: "assistant",
        content: "Couldn't reach the server. Please try again.",
      }]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100dvh",
      maxWidth: 720, margin: "0 auto",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      background: "#fff",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 20px",
        borderBottom: "0.5px solid #e5e7eb",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: "linear-gradient(135deg, #6c47c9 0%, #1a56db 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M3 9h18M9 21V9M3 5a2 2 0 012-2h14a2 2 0 012 2v4H3V5z" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#111" }}>
            LoanDoc AI
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "#888" }}>
            RAG · pgvector · Mistral 7B
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "#22c55e", display: "inline-block",
          }} />
          <span style={{ fontSize: 12, color: "#666" }}>Live</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "24px 20px 12px",
        display: "flex", flexDirection: "column", gap: 20,
      }}>
        {messages.map((msg, i) => (
          <Message key={i} msg={msg} isLast={i === messages.length - 1} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {!hasAsked && (
        <div style={{ padding: "0 20px 12px", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => submit(s)}
              style={{
                fontSize: 12, padding: "6px 13px",
                borderRadius: 20, cursor: "pointer",
                border: "0.5px solid #e0e0e0",
                background: "#fafafa", color: "#555",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.target.style.background = "#f0f4ff"; e.target.style.borderColor = "#c2d4fb"; e.target.style.color = "#1a56db"; }}
              onMouseLeave={e => { e.target.style.background = "#fafafa"; e.target.style.borderColor = "#e0e0e0"; e.target.style.color = "#555"; }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: "10px 20px 20px", borderTop: "0.5px solid #e5e7eb" }}>
        <div style={{
          display: "flex", gap: 8, alignItems: "flex-end",
          background: "#fafafa", border: "0.5px solid #d1d5db",
          borderRadius: 14, padding: "8px 8px 8px 14px",
          transition: "border-color 0.15s",
        }}
          onFocusCapture={e => e.currentTarget.style.borderColor = "#6c47c9"}
          onBlurCapture={e => e.currentTarget.style.borderColor = "#d1d5db"}
        >
          <textarea
            ref={textareaRef}
            value={input}
            rows={1}
            placeholder="Ask about your loan documents..."
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(input); }
            }}
            style={{
              flex: 1, border: "none", outline: "none", resize: "none",
              background: "transparent", fontSize: 14, lineHeight: 1.5,
              color: "#111", fontFamily: "inherit", padding: 0,
            }}
          />
          <button
            onClick={() => submit(input)}
            disabled={loading || !input.trim()}
            style={{
              width: 32, height: 32, borderRadius: 9, flexShrink: 0,
              border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              background: input.trim() && !loading ? "#1a56db" : "#e5e7eb",
              color: input.trim() && !loading ? "#fff" : "#aaa",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
            aria-label="Send"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M12 5l7 7-7 7M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <p style={{ fontSize: 11, color: "#bbb", margin: "7px 0 0", textAlign: "center" }}>
          Answers generated from uploaded loan documents · Enter to send
        </p>
      </div>
    </div>
  );
}