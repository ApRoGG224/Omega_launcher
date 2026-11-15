import React, { useState, useRef, useEffect } from "react";
import "../../styles/screens.css";

interface FriendsScreenProps {
  onBack: () => void;
  onJoinFriend: (friendName: string, serverIp: string) => void;
}

interface FriendItem {
  id: string;
  n: string;
  s: "live" | "menu" | "dnd" | "off";
  l?: string;
  v?: string;
  h?: string;
  t?: string;
}

interface RequestItem {
  id: string;
  n: string;
  m: string;
}

interface ChatItem {
  n: string;
  m: string;
  t: string;
}

interface MessageItem {
  id: string;
  sender: "me" | "them";
  text: string;
  time: string;
}

const INITIAL_FRIENDS: FriendItem[] = [
  { id: "1", n: "Alex_Miner", s: "live", l: "Fabric", v: "1.21.4", h: "mc.hypixel.net" },
  { id: "2", n: "Notch_Fan", s: "menu", t: "В главном меню лаунчера" },
  { id: "3", n: "CreeperHunter", s: "off", t: "Офлайн, был 2 часа назад" },
  { id: "4", n: "Redstone_Pro", s: "dnd", t: "Уведомления выключены" },
];

const INITIAL_REQS: RequestItem[] = [
  { id: "r1", n: "Steve_2009", m: "Хочет добавить вас в друзья" },
  { id: "r2", n: "Pixel_Witch", m: "Хочет добавить вас в друзья" },
];

const INITIAL_CHATS: ChatItem[] = [
  { n: "Alex_Miner", m: "Заходи на сервер, я уже там", t: "12:40" },
  { n: "Notch_Fan", m: "Скинь список модов", t: "Вчера" },
  { n: "Redstone_Pro", m: "Позже отвечу", t: "Вчера" },
  { n: "CreeperHunter", m: "Го в субботу на сервер", t: "Пн" },
];

const INITIAL_MESSAGES: Record<string, MessageItem[]> = {
  Alex_Miner: [
    { id: "m1", sender: "them", text: "Привет! Ты играешь сегодня?", time: "12:35" },
    { id: "m2", sender: "me", text: "Да, сейчас зайду!", time: "12:38" },
    { id: "m3", sender: "them", text: "Заходи на сервер, я уже там", time: "12:40" },
  ],
  Notch_Fan: [
    { id: "m4", sender: "them", text: "Скинь список модов", time: "Вчера" },
    { id: "m5", sender: "me", text: "Закинул в общую папку версий", time: "Вчера" },
  ],
  Redstone_Pro: [
    { id: "m6", sender: "them", text: "Позже отвечу", time: "Вчера" },
  ],
  CreeperHunter: [
    { id: "m7", sender: "them", text: "Го в субботу на сервер", time: "Пн" },
  ],
};

const FOUND_USERS = [
  { n: "Zombie_Slayer" },
  { n: "Zoe_Redstone" },
  { n: "Zed_Builder" },
];

const ST: Record<"live" | "menu" | "dnd" | "off", string> = {
  live: "Играет",
  menu: "В сети",
  dnd: "Уведомления выключены",
  off: "Не в сети",
};

export const FriendsScreen: React.FC<FriendsScreenProps> = ({
  onBack,
  onJoinFriend,
}) => {
  const [tab, setTab] = useState<"friends" | "chats" | "reqs" | "search">("friends");
  const [friends, setFriends] = useState<FriendItem[]>(INITIAL_FRIENDS);
  const [reqs, setReqs] = useState<RequestItem[]>(INITIAL_REQS);
  const [chats, setChats] = useState<ChatItem[]>(INITIAL_CHATS);
  const [chatMessages, setChatMessages] = useState<Record<string, MessageItem[]>>(INITIAL_MESSAGES);
  const [activeChatFriend, setActiveChatFriend] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [addedUsers, setAddedUsers] = useState<Record<string, boolean>>({});
  const [joiningFriend, setJoiningFriend] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const codeBtnRef = useRef<HTMLButtonElement | null>(null);
  const [isCodeOpen, setIsCodeOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const openRef = useRef(false);
  const t0Ref = useRef(0);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeChatFriend) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeChatFriend, chatMessages]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const btn = codeBtnRef.current;
    if (!canvas || !btn) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let w = 0;
    let h = 0;
    const dpr = window.devicePixelRatio || 1;
    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      a: number;
      s: number;
    }> = [];

    const size = () => {
      const r = btn.getBoundingClientRect();
      w = r.width || 120;
      h = r.height || 26;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = [];
      const n = Math.round((w * h) / 9);
      for (let i = 0; i < n; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          a: Math.random() * 6.28,
          s: 0.6 + Math.random() * 1.2,
        });
      }
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const k = openRef.current ? Math.max(0, 1 - (t - t0Ref.current) / 500) : 1;
      if (k <= 0) {
        canvas.style.display = "none";
        return;
      }
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (openRef.current) {
          p.x += (p.x - w / 2) * 0.04;
          p.y += (p.y - h / 2) * 0.04;
        }
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        const al = (0.35 + 0.55 * Math.abs(Math.sin(t / 300 + p.a))) * k;
        ctx.fillStyle = `rgba(230, 232, 236, ${al})`;
        ctx.fillRect(p.x, p.y, p.s, p.s);
      });
      animId = requestAnimationFrame(draw);
    };

    size();
    animId = requestAnimationFrame(draw);

    const onResize = () => {
      if (!openRef.current) size();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const handleOpenCode = () => {
    if (openRef.current) return;
    openRef.current = true;
    t0Ref.current = performance.now();
    setIsCodeOpen(true);
  };

  const handleCopyCode = () => {
    try {
      navigator.clipboard?.writeText("OMG-774921");
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleAcceptReq = (index: number) => {
    const r = reqs[index];
    if (!r) return;
    setReqs((prev) => prev.filter((_, idx) => idx !== index));
    setFriends((prev) => [
      ...prev,
      { id: "f_" + Date.now(), n: r.n, s: "off", t: "Офлайн" },
    ]);
  };

  const handleDeclineReq = (index: number) => {
    setReqs((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeChatFriend) return;
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
    const newMsg: MessageItem = {
      id: "msg_" + Date.now(),
      sender: "me",
      text: chatInput.trim(),
      time: timeStr,
    };

    setChatMessages((prev) => ({
      ...prev,
      [activeChatFriend]: [...(prev[activeChatFriend] || []), newMsg],
    }));

    setChats((prev) => {
      const exists = prev.some((c) => c.n === activeChatFriend);
      if (exists) {
        return prev.map((c) =>
          c.n === activeChatFriend
            ? { ...c, m: newMsg.text, t: timeStr }
            : c
        );
      }
      return [{ n: activeChatFriend, m: newMsg.text, t: timeStr }, ...prev];
    });

    setChatInput("");
  };

  const renderStatusIcon = (status: "live" | "menu" | "dnd" | "off") => {
    switch (status) {
      case "live":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 7h10a4 4 0 014 4l.6 4.5a2.5 2.5 0 01-4.4 1.9L15 15H9l-2.2 2.4a2.5 2.5 0 01-4.4-1.9L3 11a4 4 0 014-4z" />
            <path d="M8 10v4M6 12h4" />
            <circle cx="15.5" cy="11" r=".7" />
            <circle cx="17.5" cy="13" r=".7" />
          </svg>
        );
      case "menu":
        return (
          <svg viewBox="0 0 12 12">
            <circle cx="6" cy="6" r="4" fill="currentColor" />
          </svg>
        );
      case "dnd":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0112 0c0 3 1 5 2 6H4c.6-.8 1.2-1.9 1.6-3M10 18a2 2 0 004 0M3 3l18 18" />
          </svg>
        );
      case "off":
        return (
          <svg viewBox="0 0 12 12">
            <circle cx="6" cy="6" r="4" fill="currentColor" />
          </svg>
        );
    }
  };

  const renderAvatar = (name: string, status?: "live" | "menu" | "dnd" | "off") => (
    <div className="av">
      {name.charAt(0).toUpperCase()}
      {status && (
        <i className={`bd ${status}`} title={ST[status]}>
          {renderStatusIcon(status)}
        </i>
      )}
    </div>
  );

  const qTrim = searchQuery.trim().toLowerCase();
  const filteredFound = FOUND_USERS.filter(
    (x) => qTrim && x.n.toLowerCase().includes(qTrim)
  );
  const showCustomAdd =
    qTrim.length > 0 &&
    !filteredFound.some((f) => f.n.toLowerCase() === qTrim) &&
    !friends.some((f) => f.n.toLowerCase() === qTrim);

  return (
    <div className="screens-overlay-layer friends-screen-overlay">
      <main className="app">
        <div className="top">
          <button
            type="button"
            className="b sm"
            onClick={onBack}
            title="Назад (Esc)"
          >
            ← Назад
          </button>
          <h1>Друзья и совместная игра</h1>
          <div className="dock" id="tabs" role="tablist">
            <button
              type="button"
              className={`f ${tab === "friends" ? "on" : ""}`}
              role="tab"
              aria-selected={tab === "friends"}
              onClick={() => {
                setTab("friends");
                setActiveChatFriend(null);
              }}
            >
              Друзья<i>{friends.length}</i>
            </button>
            <button
              type="button"
              className={`f ${tab === "chats" ? "on" : ""}`}
              role="tab"
              aria-selected={tab === "chats"}
              onClick={() => setTab("chats")}
            >
              Чаты
            </button>
            <button
              type="button"
              className={`f ${tab === "reqs" ? "on" : ""}`}
              role="tab"
              aria-selected={tab === "reqs"}
              onClick={() => {
                setTab("reqs");
                setActiveChatFriend(null);
              }}
            >
              Заявки{reqs.length > 0 && <i>{reqs.length}</i>}
            </button>
            <button
              type="button"
              className={`f ${tab === "search" ? "on" : ""}`}
              role="tab"
              aria-selected={tab === "search"}
              onClick={() => {
                setTab("search");
                setActiveChatFriend(null);
              }}
            >
              Поиск
            </button>
          </div>
        </div>

        <div className="card code">
          <div className="t">
            <small>Твой код друга</small>
            <button
              ref={codeBtnRef}
              type="button"
              className={`sp ${isCodeOpen ? "open" : ""}`}
              id="code"
              aria-label={isCodeOpen ? undefined : "Показать код друга"}
              onClick={handleOpenCode}
            >
              <span>OMG-774921</span>
              <canvas ref={canvasRef} />
            </button>
          </div>
          <div className="a">
            <button
              type="button"
              className={`b ${copied ? "on" : ""}`}
              id="copy"
              onClick={handleCopyCode}
            >
              {copied ? "Скопировано" : "Скопировать"}
            </button>
          </div>
        </div>

        <div className="list" id="view">
          {tab === "friends" && (
            friends.length === 0 ? (
              <div className="card empty">
                Пока никого нет. Найдите друга по коду во вкладке «Поиск».
              </div>
            ) : (
              friends.map((f) => (
                <div key={f.n} className="card item">
                  {renderAvatar(f.n, f.s)}
                  <div className="who">
                    <b>{f.n}</b>
                    <span>
                      {f.s === "live" ? (
                        <>
                          В игре{" "}
                          <span
                            className="tag"
                            style={{
                              background: "rgba(207,192,160,.12)",
                              color: "#b3a688",
                            }}
                          >
                            {f.l} {f.v}
                          </span>{" "}
                          {f.h}
                        </>
                      ) : (
                        f.t
                      )}
                    </span>
                  </div>
                  {f.s === "live" && f.h && (
                    <div className="acts">
                      <button
                        type="button"
                        className={`b ${joiningFriend === f.n ? "on" : "go"}`}
                        onClick={() => {
                          setJoiningFriend(f.n);
                          onJoinFriend(f.n, f.h!);
                        }}
                      >
                        {joiningFriend === f.n ? "Подключаемся…" : "Присоединиться"}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )
          )}

          {tab === "chats" && (
            activeChatFriend ? (
              <div className="chat-convo-wrap">
                <div className="chat-header-bar">
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button
                      type="button"
                      className="b sm"
                      onClick={() => setActiveChatFriend(null)}
                      title="К списку диалогов"
                    >
                      ← Чаты
                    </button>
                    {renderAvatar(
                      activeChatFriend,
                      friends.find((x) => x.n === activeChatFriend)?.s || "off"
                    )}
                    <div>
                      <b style={{ color: "var(--tx)", fontSize: "14px", display: "block" }}>
                        {activeChatFriend}
                      </b>
                      <span style={{ color: "var(--mut)", fontSize: "11.5px" }}>
                        {ST[friends.find((x) => x.n === activeChatFriend)?.s || "off"]}
                      </span>
                    </div>
                  </div>

                  {(() => {
                    const friend = friends.find((x) => x.n === activeChatFriend);
                    if (friend?.s === "live" && friend.h) {
                      return (
                        <button
                          type="button"
                          className={`b sm ${joiningFriend === friend.n ? "on" : "go"}`}
                          onClick={() => {
                            setJoiningFriend(friend.n);
                            onJoinFriend(friend.n, friend.h!);
                          }}
                        >
                          {joiningFriend === friend.n ? "Подключаемся…" : "Присоединиться"}
                        </button>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div className="chat-box">
                  <div className="chat-msgs">
                    {(chatMessages[activeChatFriend] || []).map((msg) => (
                      <div
                        key={msg.id}
                        className={`chat-bubble ${msg.sender === "me" ? "me" : "them"}`}
                      >
                        <div>{msg.text}</div>
                        <div className="chat-bubble-time">{msg.time}</div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  <form onSubmit={handleSendMessage} className="chat-input-bar">
                    <input
                      type="text"
                      placeholder="Напишите сообщение..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      autoFocus
                    />
                    <button type="submit" className="b go">
                      Отправить
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              chats.map((c) => {
                const friend = friends.find((x) => x.n === c.n);
                const s = friend ? friend.s : "off";
                return (
                  <div
                    key={c.n}
                    className="card item clickable"
                    onClick={() => setActiveChatFriend(c.n)}
                  >
                    {renderAvatar(c.n, s)}
                    <div className="who">
                      <b>
                        {c.n}
                        <small
                          style={{
                            color: "var(--mut)",
                            fontWeight: 600,
                            fontSize: "11px",
                            marginLeft: "8px",
                          }}
                        >
                          {ST[s]}
                        </small>
                      </b>
                      <span>{c.m}</span>
                    </div>
                    <span style={{ color: "var(--mut)", fontSize: "12px", whiteSpace: "nowrap" }}>
                      {c.t}
                    </span>
                  </div>
                );
              })
            )
          )}

          {tab === "reqs" && (
            reqs.length === 0 ? (
              <div className="card empty">Новых заявок нет.</div>
            ) : (
              reqs.map((r, i) => (
                <div key={r.n} className="card item">
                  {renderAvatar(r.n)}
                  <div className="who">
                    <b>{r.n}</b>
                    <span>{r.m}</span>
                  </div>
                  <div className="acts">
                    <button
                      type="button"
                      className="b go"
                      onClick={() => handleAcceptReq(i)}
                    >
                      Принять
                    </button>
                    <button
                      type="button"
                      className="b del"
                      onClick={() => handleDeclineReq(i)}
                    >
                      Отклонить
                    </button>
                  </div>
                </div>
              ))
            )
          )}

          {tab === "search" && (
            <>
              <input
                id="q"
                placeholder="Ник или код друга"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Поиск игроков"
                autoFocus
              />
              {filteredFound.length > 0 || showCustomAdd ? (
                <>
                  {filteredFound.map((x) => {
                    const isSent = !!addedUsers[x.n];
                    return (
                      <div key={x.n} className="card item">
                        {renderAvatar(x.n)}
                        <div className="who">
                          <b>{x.n}</b>
                        </div>
                        <div className="acts">
                          <button
                            type="button"
                            className={`b ${isSent ? "on" : ""}`}
                            disabled={isSent}
                            onClick={() => {
                              setAddedUsers((prev) => ({ ...prev, [x.n]: true }));
                            }}
                          >
                            {isSent ? "Заявка отправлена" : "Добавить"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {showCustomAdd && (
                    <div key="custom" className="card item">
                      {renderAvatar(searchQuery.trim())}
                      <div className="who">
                        <b>{searchQuery.trim()}</b>
                      </div>
                      <div className="acts">
                        <button
                          type="button"
                          className={`b ${addedUsers[searchQuery.trim()] ? "on" : ""}`}
                          disabled={!!addedUsers[searchQuery.trim()]}
                          onClick={() => {
                            setAddedUsers((prev) => ({
                              ...prev,
                              [searchQuery.trim()]: true,
                            }));
                          }}
                        >
                          {addedUsers[searchQuery.trim()]
                            ? "Заявка отправлена"
                            : "Добавить"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="card empty">
                  {searchQuery
                    ? "Никого не нашли. Проверьте ник или код."
                    : "Введите ник или код друга."}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};
