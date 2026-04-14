import { useState, useEffect, useRef } from "react";


function getInitials(emailStr) {
  if (!emailStr) return "?";
  const name = emailStr.split("<")[0].trim();
  return name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
}

function getDisplayName(emailStr) {
  if (!emailStr) return "Unknown";
  return emailStr.split("<")[0].trim();
}

function getAvatarColor(name) {
  const colors = ["#7C6AF7","#E8734A","#3DA882","#C45FAE","#4A8FE8","#D4A017","#5BA85E","#A85B5B"];
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % colors.length;
  return colors[Math.abs(hash)];
}

function formatDate(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
  } catch { return dateStr; }
}

function EmailCard({ email, index, highlighted }) {
  const [expanded, setExpanded] = useState(index === 0);
  const name = getDisplayName(email.sender);
  const color = getAvatarColor(name);
  const isImportant = email.labels?.includes?.("Important") ?? false;

  return (
    <div
      style={{
        marginBottom: 12,
        borderRadius: 14,
        border: highlighted ? "1.5px solid #7C6AF7" : "1px solid rgba(0,0,0,0.07)",
        background: expanded ? "#fff" : "rgba(255,255,255,0.6)",
        boxShadow: highlighted
          ? "0 0 0 3px rgba(124,106,247,0.1), 0 4px 24px rgba(0,0,0,0.07)"
          : expanded ? "0 4px 24px rgba(0,0,0,0.08)" : "none",
        transition: "all 0.25s ease",
        overflow: "hidden",
        cursor: "pointer",
      }}
      onClick={() => setExpanded(e => !e)}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
        <div style={{
          width: 38, height: 38, borderRadius: "50%", background: color, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 600, flexShrink: 0,
        }}>
          {getInitials(email.sender)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{
              fontFamily: "'Instrument Serif', serif", fontSize: 15, fontWeight: 600, color: "#1a1a1a",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180,
            }}>
              {name}
            </span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#999", flexShrink: 0, marginLeft: 8 }}>
              {formatDate(email.date)}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
            {isImportant && (
              <span style={{ background: "#FFF0E8", color: "#E8734A", borderRadius: 4, padding: "1px 6px", fontSize: 10, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
                IMPORTANT
              </span>
            )}
            {highlighted && (
              <span style={{ background: "#EEF0FF", color: "#7C6AF7", borderRadius: 4, padding: "1px 6px", fontSize: 10, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
                MATCHED
              </span>
            )}
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {email.subject ?? "(no subject)"}
            </span>
          </div>
        </div>

        <div style={{ color: "#bbb", flexShrink: 0, fontSize: 16, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>
          &#9662;
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 16px 16px" }}>
          <div style={{ height: 1, background: "rgba(0,0,0,0.06)", marginBottom: 12 }} />
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#888", marginBottom: 10, display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
            {email.receiver && <span><b style={{ color: "#aaa" }}>To:</b> {email.receiver}</span>}
            {email.cc && <span><b style={{ color: "#aaa" }}>Cc:</b> {email.cc}</span>}
          </div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#333", lineHeight: 1.7, whiteSpace: "pre-line", margin: 0 }}>
            {(email.msg_body ?? "").trim()}
          </p>
        </div>
      )}
    </div>
  );
}

function renderMarkdown(text) {
  const lines = text.split("\n");
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      elements.push(<div key={i} style={{ height: 6 }} />);
      i++; continue;
    }
    if (line.startsWith("# ")) {
      elements.push(<div key={i} style={{ fontFamily:"'Instrument Serif',serif", fontSize:17, fontWeight:600, color:"#1a1a1a", marginBottom:4, marginTop:6 }}>{inlineMd(line.slice(2))}</div>);
      i++; continue;
    }
    if (line.startsWith("## ")) {
      elements.push(<div key={i} style={{ fontFamily:"'Instrument Serif',serif", fontSize:15, fontWeight:600, color:"#1a1a1a", marginBottom:3, marginTop:6 }}>{inlineMd(line.slice(3))}</div>);
      i++; continue;
    }
    if (line.startsWith("### ")) {
      elements.push(<div key={i} style={{ fontFamily:"'DM Mono',monospace", fontSize:12, fontWeight:600, color:"#7C6AF7", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:3, marginTop:6 }}>{inlineMd(line.slice(4))}</div>);
      i++; continue;
    }
    if (/^[-*]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(<li key={i} style={{ marginBottom:3 }}>{inlineMd(lines[i].replace(/^[-*]\s/,""))}</li>);
        i++;
      }
      elements.push(<ul key={"ul"+i} style={{ paddingLeft:18, margin:"4px 0" }}>{items}</ul>);
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(<li key={i} style={{ marginBottom:3 }}>{inlineMd(lines[i].replace(/^\d+\.\s/,""))}</li>);
        i++;
      }
      elements.push(<ol key={"ol"+i} style={{ paddingLeft:18, margin:"4px 0" }}>{items}</ol>);
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={i} style={{ border:"none", borderTop:"1px solid rgba(0,0,0,0.1)", margin:"8px 0" }} />);
      i++; continue;
    }
    elements.push(<div key={i} style={{ marginBottom:2 }}>{inlineMd(line)}</div>);
    i++;
  }
  return <div style={{ lineHeight:1.7 }}>{elements}</div>;
}

function inlineMd(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_)/g);
  return parts.map((part, idx) => {
    if (/^\*\*/.test(part) || /^__/.test(part))
      return <strong key={idx} style={{ fontWeight:600 }}>{part.slice(2,-2)}</strong>;
    if (/^`/.test(part))
      return <code key={idx} style={{ background:"rgba(0,0,0,0.08)", borderRadius:4, padding:"1px 5px", fontFamily:"'DM Mono',monospace", fontSize:"0.9em" }}>{part.slice(1,-1)}</code>;
    if (/^\*/.test(part) || /^_/.test(part))
      return <em key={idx}>{part.slice(1,-1)}</em>;
    return part;
  });
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "10px 14px", background: "#F0EFF9", borderRadius: "18px 18px 18px 4px", width: "fit-content" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%", background: "#7C6AF7",
          animation: "bounce 1.2s infinite", animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </div>
  );
}

export default function EmailAgentPanel() {
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);

  const [messages, setMessages] = useState([
    { role: "agent", text: "Hello! I've loaded the email context. Ask me anything about this conversation." }
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // null = show all; string[] = ids from last agent response contexts
  const [filteredIds, setFilteredIds] = useState(null);

  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  const isEmailMatched = (email) => {
    if (!filteredIds) return false;
    return filteredIds.includes(email.message_id);
  };

  const displayedHistory = filteredIds === null
    ? history
    : history.filter(isEmailMatched);

  useEffect(() => {
    fetch("/api/history")
      .then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then(data => { setHistory(Array.isArray(data) ? data : [data]); setHistoryLoading(false); })
      .catch(() => { setHistory([]); setHistoryLoading(false); setHistoryError("Waiting for processing data. Please refresh in a few seconds"); });
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const handleReset = () => {
    setFilteredIds(null);
    setMessages([{ role: "agent", text: "Hello! I've loaded the email context. Ask me anything about this conversation." }]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const sendMessage = async () => {
    const q = input.trim();
    if (!q || sending) return;

    setMessages(m => [...m, { role: "user", text: q }]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setSending(true);

    try {
      const res = await fetch("/api/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();

      // Extract context ids and filter the left panel
      const contextIds = (data.contexts ?? []).map(c => c.id).filter(id => id != null);
      setFilteredIds(contextIds.length > 0 ? contextIds : null);

      setMessages(m => [...m, { role: "agent", text: data.answer ?? data.response ?? JSON.stringify(data) }]);
    } catch {
      setMessages(m => [...m, { role: "agent", text: "Waiting for processing data. Please try again in a few seconds" }]);
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #F5F4F0; }
    .root { display:flex; height:100vh; width:100%; font-family:'DM Sans',sans-serif; background:#F5F4F0; overflow:hidden; }
    .left-panel { width:50%; display:flex; flex-direction:column; border-right:1.5px solid rgba(0,0,0,0.08); background:#F5F4F0; overflow:hidden; }
    .right-panel { width:50%; display:flex; flex-direction:column; background:#FAFAF8; overflow:hidden; }
    .panel-header { padding:24px 28px 20px; flex-shrink:0; display:flex; align-items:flex-start; justify-content:space-between; }
    .panel-header-left { display:flex; flex-direction:column; }
    .panel-title { font-family:'Instrument Serif',serif; font-size:26px; color:#1a1a1a; letter-spacing:-0.3px; }
    .panel-subtitle { font-family:'DM Mono',monospace; font-size:11px; color:#999; margin-top:3px; text-transform:uppercase; letter-spacing:0.5px; }
    .panel-divider { height:1.5px; flex-shrink:0; background:linear-gradient(90deg,#7C6AF7 0%,rgba(124,106,247,0.1) 100%); margin:0 28px; border-radius:2px; }
    .reset-btn { display:flex; align-items:center; gap:6px; padding:6px 12px; border-radius:8px; border:none; cursor:pointer; font-family:'DM Mono',monospace; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; background:#F0EFF9; color:#7C6AF7; transition:background 0.15s, transform 0.1s; white-space:nowrap; margin-top:4px; }
    .reset-btn:hover { background:#E4E2F9; }
    .reset-btn:active { transform:scale(0.96); }
    .filter-banner { margin:10px 28px 0; background:#EEF0FF; border:1px solid rgba(124,106,247,0.25); color:#5A50C8; border-radius:8px; padding:8px 12px; font-family:'DM Mono',monospace; font-size:11px; display:flex; align-items:center; gap:8px; }
    .left-scroll { flex:1; overflow-y:auto; padding:20px 28px; scrollbar-width:thin; scrollbar-color:#ddd transparent; }
    .left-scroll::-webkit-scrollbar { width:4px; }
    .left-scroll::-webkit-scrollbar-thumb { background:#ddd; border-radius:4px; }
    .chat-scroll { flex:1; overflow-y:auto; padding:24px 28px; display:flex; flex-direction:column; gap:14px; scrollbar-width:thin; scrollbar-color:#ddd transparent; }
    .chat-scroll::-webkit-scrollbar { width:4px; }
    .chat-scroll::-webkit-scrollbar-thumb { background:#ddd; border-radius:4px; }
    .bubble-wrap-user { display:flex; justify-content:flex-end; }
    .bubble-wrap-agent { display:flex; justify-content:flex-start; }
    .bubble { max-width:75%; padding:11px 16px; font-size:14px; line-height:1.65; white-space:pre-wrap; word-break:break-word; animation:fadeUp 0.2s ease; }
    .bubble-user { background:#1a1a1a; color:#fff; border-radius:18px 18px 4px 18px; font-family:'DM Sans',sans-serif; }
    .bubble-agent { background:#F0EFF9; color:#1a1a1a; border-radius:18px 18px 18px 4px; font-family:'DM Sans',sans-serif; }
    .bubble-label { font-family:'DM Mono',monospace; font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px; }
    .label-user { color:#999; text-align:right; }
    .label-agent { color:#7C6AF7; }
    .input-area { flex-shrink:0; padding:16px 28px 20px; border-top:1.5px solid rgba(0,0,0,0.07); background:#FAFAF8; }
    .input-wrap { display:flex; align-items:flex-end; gap:10px; background:#fff; border:1.5px solid rgba(0,0,0,0.1); border-radius:16px; padding:10px 12px 10px 16px; transition:border-color 0.2s; box-shadow:0 2px 12px rgba(0,0,0,0.04); }
    .input-wrap:focus-within { border-color:#7C6AF7; box-shadow:0 2px 12px rgba(124,106,247,0.12); }
    .chat-input { flex:1; border:none; outline:none; resize:none; font-family:'DM Sans',sans-serif; font-size:14px; color:#1a1a1a; background:transparent; line-height:1.5; max-height:120px; min-height:22px; }
    .chat-input::placeholder { color:#bbb; }
    .send-btn { width:36px; height:36px; border-radius:10px; border:none; background:#1a1a1a; color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:background 0.15s, transform 0.1s; }
    .send-btn:hover:not(:disabled) { background:#7C6AF7; }
    .send-btn:active:not(:disabled) { transform:scale(0.94); }
    .send-btn:disabled { background:#ddd; cursor:not-allowed; }
    .hint-text { font-family:'DM Mono',monospace; font-size:10px; color:#bbb; margin-top:7px; text-align:center; text-transform:uppercase; letter-spacing:0.5px; }
    .error-badge { margin:10px 28px 0; background:#FFF8F0; border:1px solid #FDDCB5; color:#B86A00; border-radius:8px; padding:8px 12px; font-family:'DM Mono',monospace; font-size:11px; }
    .loading-wrap { display:flex; gap:8px; padding:40px 28px; justify-content:center; align-items:center; }
    .no-match { text-align:center; padding:40px 28px; font-family:'DM Mono',monospace; font-size:12px; color:#bbb; }
    @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
    @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
  `;

  return (
    <>
      <style>{CSS}</style>

      <div className="root">
        {/* LEFT PANEL */}
        <div className="left-panel">
          <div className="panel-header">
            <div className="panel-header-left">
              <div className="panel-title">Messages / Context</div>
              <div className="panel-subtitle">
                {filteredIds
                  ? `${displayedHistory.length} of ${history.length} matched`
                  : `Email thread · ${history.length} messages`}
              </div>
            </div>
          </div>
          <div className="panel-divider" />

          {historyError && <div className="error-badge">&#9888; {historyError}</div>}

          {filteredIds && (
            <div className="filter-banner">
              <span>&#128269;</span>
              <span>
                Showing {displayedHistory.length} email{displayedHistory.length !== 1 ? "s" : ""} referenced by the last answer
              </span>
            </div>
          )}

          <div className="left-scroll">
            {historyLoading ? (
              <div className="loading-wrap">
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#7C6AF7", animation: "bounce 1.2s infinite", animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            ) : displayedHistory.length === 0 ? (
              <div className="no-match">No matching emails found</div>
            ) : (
              displayedHistory.map((email, i) => (
                <EmailCard
                  key={email.message_id || i}
                  email={email}
                  index={i}
                  highlighted={isEmailMatched(email)}
                />
              ))
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="right-panel">
          <div className="panel-header">
            <div className="panel-header-left">
              <div className="panel-title">Chat</div>
              <div className="panel-subtitle">AI Agent &middot; Context-aware</div>
            </div>
            <button className="reset-btn" onClick={handleReset} title="Reset chat and filters">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M2 8a6 6 0 1 0 1.5-3.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M2 3.5V8h4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Reset
            </button>
          </div>
          <div className="panel-divider" />

          <div className="chat-scroll">
            {messages.map((msg, i) => (
              <div key={i} className={`bubble-wrap-${msg.role}`}>
                <div>
                  <div className={`bubble-label label-${msg.role}`}>
                    {msg.role === "user" ? "You" : "Agent"}
                  </div>
                  <div className={`bubble bubble-${msg.role}`}>{msg.role === "agent" ? renderMarkdown(msg.text) : msg.text}</div>
                </div>
              </div>
            ))}

            {sending && (
              <div className="bubble-wrap-agent">
                <div>
                  <div className="bubble-label label-agent">Agent</div>
                  <TypingIndicator />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="input-area">
            <div className="input-wrap">
              <textarea
                ref={textareaRef}
                className="chat-input"
                placeholder="Enter the question..."
                value={input}
                rows={1}
                onChange={e => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={handleKey}
              />
              <button className="send-btn" onClick={sendMessage} disabled={!input.trim() || sending}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M14 8L2 2l2.5 6L2 14l12-6z" fill="currentColor" />
                </svg>
              </button>
            </div>
            <div className="hint-text">Enter to send &middot; Shift+Enter for new line</div>
          </div>
        </div>
      </div>
    </>
  );
}