"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  Search,
  Users,
  Settings,
  Plus,
  ArrowUpRight,
  ArrowUp,
  MessageSquare,
  Star,
  Trash2,
  LogOut,
  ShieldCheck,
  Network,
  ChevronRight,
  Download,
  X,
  LoaderCircle,
} from "lucide-react";
import type { Contact, Profile } from "@/lib/schema";
import type { Match } from "@/lib/retrieval";
type Conversation = {
  id: string;
  title: string;
  messages: { role: string; text: string; ids: string[] }[];
};
type SettingsValue = {
  provider: "openai" | "gemini" | "custom";
  model: string;
  endpoint: string;
  configured: boolean;
  consent: boolean;
};
type Reply = {
  text: string;
  mode: string;
  warning: string;
  matches: Match[];
  conversationId: string;
};
const emptyProfile: Profile = {
  name: "",
  location: "",
  interests: "",
  occupation: "",
  background: "",
};
const emptyContact: Contact = {
  id: "",
  name: "",
  type: "person",
  methods: [{ type: "email", value: "" }],
  location: "",
  occupation: "",
  organization: "",
  skills: "",
  interests: "",
  met: "",
  relationship: "",
  shared: "",
  tags: "",
  notes: "",
  lastInteraction: "",
  interactionNotes: "",
  favorite: false,
};
async function api(path: string, method = "GET", body?: unknown) {
  const response = await fetch("/api/" + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}
function Initials({ name }: { name: string }) {
  return (
    <span className="avatar">
      {name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")}
    </span>
  );
}
const labels: Record<string, string> = {
  name: "Name",
  location: "Location",
  occupation: "Occupation / university",
  organization: "Organization",
  skills: "Skills & expertise",
  interests: "Interests",
  met: "How, where & when you met",
  relationship: "Relationship",
  shared: "Shared background",
  tags: "Tags",
  notes: "Additional notes",
  lastInteraction: "Last interaction",
  interactionNotes: "Interaction notes",
  background: "Background",
};
function ContactLinks({ contact }: { contact: Contact }) {
  return (
    <div className="methods">
      {contact.methods.map((m, i) =>
        m.type === "custom" ? (
          <span key={i} className="method">
            {m.value}
          </span>
        ) : (
          <a
            key={i}
            className="method"
            href={
              m.type === "email"
                ? "mailto:" + m.value
                : m.type === "phone"
                  ? "tel:" + m.value
                  : m.value
            }
            target={
              ["social", "website"].includes(m.type) ? "_blank" : undefined
            }
            rel="noopener noreferrer"
          >
            {m.value}
            <ArrowUpRight size={13} />
          </a>
        ),
      )}
    </div>
  );
}
export default function NetPro({
  initialContact,
}: {
  initialContact?: string;
}) {
  const [status, setStatus] = useState<"loading" | "setup" | "login" | "ready">(
    "loading",
  );
  const [view, setView] = useState<"search" | "contacts" | "settings">(
    initialContact ? "contacts" : "search",
  );
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [all, setAll] = useState<Contact[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [configuration, setConfiguration] = useState<SettingsValue>({
    provider: "openai",
    model: "",
    endpoint: "https://api.openai.com/v1",
    configured: false,
    consent: false,
  });
  const [providerDraft, setProviderDraft] =
    useState<SettingsValue["provider"]>("openai");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(initialContact || "");
  const [editing, setEditing] = useState<Contact | null>(null);
  const [reply, setReply] = useState<Reply | null>(null);
  const [conversationId, setConversationId] = useState<string>();
  const [history, setHistory] = useState<Conversation["messages"]>([]);
  const [useAi, setUseAi] = useState(false);
  const [importData, setImportData] = useState<unknown>();
  const [summary, setSummary] = useState<{
    contacts: number;
    conversations: number;
    profile: string;
  }>();
  async function load() {
    const [p, c, s, h] = await Promise.all([
      api("profile"),
      api("contacts"),
      api("settings"),
      api("conversations"),
    ]);
    setProfile(p);
    setAll(c);
    setConfiguration(s);
    setProviderDraft(s.provider);
    setConversations(h);
    setStatus("ready");
  }
  useEffect(() => {
    api("status")
      .then((s) =>
        s.setup
          ? setStatus("setup")
          : s.authenticated
            ? load()
            : setStatus("login"),
      )
      .catch((e) => setError(e.message));
  }, []);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }
  async function search(event?: FormEvent, value = query) {
    event?.preventDefault();
    if (!value.trim()) return;
    await run(async () => {
      const result: Reply = await api("search", "POST", {
        query: value,
        conversationId,
        ai: useAi,
      });
      setReply(result);
      setConversationId(result.conversationId);
      setHistory((h) => [
        ...h,
        { role: "user", text: value, ids: [] },
        {
          role: "assistant",
          text: result.text,
          ids: result.matches.map((m) => m.contact.id),
        },
      ]);
      setQuery("");
      setConversations(await api("conversations"));
    });
  }
  const current = all.find((c) => c.id === selected);
  if (status === "loading")
    return (
      <main className="auth">
        <Network className="accent" size={40} />
        <h1>NetPro</h1>
        <p role="status">{error || "Opening your private workspace…"}</p>
        {error && <button onClick={() => location.reload()}>Retry</button>}
      </main>
    );
  if (status === "setup" || status === "login")
    return (
      <main className="auth">
        <div className="brand">
          <span className="logo">
            <Network size={22} />
          </span>
          NetPro<span className="beta">SELF-HOSTED</span>
        </div>
        <div className="auth-card">
          <span className="eyebrow">YOUR NETWORK, REMEMBERED</span>
          <h1>
            {status === "setup"
              ? "Make room for meaningful connections."
              : "Welcome back."}
          </h1>
          <p>
            {status === "setup"
              ? "Create the single owner account for this installation. Your contacts stay here. AI is optional and starts disabled."
              : "Sign in to your private network."}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              void run(async () => {
                await api(status === "setup" ? "setup" : "login", "POST", {
                  username: data.get("username"),
                  password: data.get("password"),
                  ...(status === "setup"
                    ? {
                        profile: {
                          ...emptyProfile,
                          name: data.get("name"),
                          location: data.get("location"),
                          interests: data.get("interests"),
                          occupation: data.get("occupation"),
                          background: data.get("background"),
                        },
                      }
                    : {}),
                });
                await load();
              });
            }}
          >
            <Field label="Username">
              <input
                name="username"
                autoComplete="username"
                minLength={3}
                maxLength={80}
                required
              />
            </Field>
            <Field label="Password · at least 12 characters">
              <input
                name="password"
                type="password"
                autoComplete={
                  status === "setup" ? "new-password" : "current-password"
                }
                minLength={12}
                maxLength={128}
                required
              />
            </Field>
            {status === "setup" && (
              <>
                <Field label="Your name">
                  <input name="name" required maxLength={120} />
                </Field>
                {["location", "interests", "occupation", "background"].map(
                  (k) => (
                    <Field key={k} label={labels[k]}>
                      <input name={k} maxLength={2000} />
                    </Field>
                  ),
                )}
              </>
            )}
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button className="primary" disabled={busy}>
              {busy
                ? "Please wait…"
                : status === "setup"
                  ? "Create my workspace"
                  : "Sign in"}
              <ArrowUpRight size={18} />
            </button>
          </form>
        </div>
        <p className="small">
          <ShieldCheck size={14} /> One owner. Your database. Your choice.
        </p>
      </main>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/">
          <span className="logo">
            <Network size={22} />
          </span>
          NetPro
        </Link>
        <span className="eyebrow side-label">YOUR WORKSPACE</span>
        <nav aria-label="Main navigation">
          {(
            [
              { key: "search", title: "Search", icon: Search },
              { key: "contacts", title: "Contacts", icon: Users },
              { key: "settings", title: "Settings", icon: Settings },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              aria-current={view === item.key ? "page" : undefined}
              className={view === item.key ? "nav-item active" : "nav-item"}
              onClick={() => {
                setView(item.key);
                setSelected("");
                setError("");
              }}
            >
              <item.icon size={19} />
              {item.title}
              {item.key === "contacts" && (
                <span className="count">{all.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="recent">
          <div className="side-heading">
            <span className="eyebrow">CONVERSATIONS</span>
            <button
              className="icon-button"
              title="New conversation"
              onClick={() => {
                setConversationId(undefined);
                setReply(null);
                setHistory([]);
                setView("search");
              }}
            >
              <Plus size={16} />
            </button>
          </div>
          {conversations.length === 0 ? (
            <p className="muted small">Your searches will appear here.</p>
          ) : (
            conversations.slice(0, 20).map((c) => (
              <div className="conversation-row" key={c.id}>
                <button
                  className={
                    conversationId === c.id
                      ? "conversation chosen"
                      : "conversation"
                  }
                  onClick={() => {
                    setConversationId(c.id);
                    setHistory(c.messages);
                    setReply(null);
                    setView("search");
                  }}
                >
                  <MessageSquare size={14} />
                  <span>{c.title}</span>
                </button>
                <button
                  className="icon-button delete-conversation"
                  title={"Delete " + c.title}
                  onClick={() => {
                    if (confirm("Delete this saved conversation?"))
                      void run(async () => {
                        await api("conversations/" + c.id, "DELETE");
                        setConversations(await api("conversations"));
                        if (conversationId === c.id) {
                          setConversationId(undefined);
                          setHistory([]);
                          setReply(null);
                        }
                      });
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="private">
            <ShieldCheck size={16} />
            <div>
              <strong>Private by design</strong>
              <small>
                {configuration.consent
                  ? "AI enabled with your consent"
                  : "Cloud AI is off"}
              </small>
            </div>
          </div>
          <div className="owner">
            <Initials name={profile.name} />
            <div>
              <strong>{profile.name}</strong>
              <small>Personal workspace</small>
            </div>
            <button
              className="icon-button"
              title="Sign out"
              onClick={() =>
                void run(async () => {
                  await api("logout", "POST", {});
                  setStatus("login");
                  setView("search");
                  setSelected("");
                  setConversationId(undefined);
                  setAll([]);
                  setProfile(emptyProfile);
                  setHistory([]);
                  setReply(null);
                })
              }
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            Your network <ChevronRight size={14} />
            <strong>
              {view === "search"
                ? "Search"
                : view === "contacts"
                  ? "Contacts"
                  : "Settings"}
            </strong>
          </span>
          <span className="local-badge">
            <i /> Local workspace
          </span>
          <button
            className="icon-button mobile-signout"
            title="Sign out"
            onClick={() =>
              void run(async () => {
                await api("logout", "POST", {});
                setStatus("login");
                setView("search");
                setSelected("");
                setConversationId(undefined);
                setAll([]);
                setProfile(emptyProfile);
                setHistory([]);
                setReply(null);
              })
            }
          >
            <LogOut size={16} />
          </button>
        </header>
        <main className="main">
          {error && (
            <div role="alert" className="banner error">
              {error}
              <button
                title="Dismiss error"
                className="icon-button"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div role="status" className="banner success">
              {notice}
            </div>
          )}
          {view === "search" && (
            <>
              <div className="conversation-toolbar">
                <button
                  disabled={busy}
                  onClick={() => {
                    setConversationId(undefined);
                    setHistory([]);
                    setReply(null);
                    setNotice("");
                  }}
                >
                  <Plus size={14} />
                  New conversation
                </button>
                <select
                  aria-label="Saved conversations"
                  value={conversationId || ""}
                  onChange={(e) => {
                    const c = conversations.find(
                      (c) => c.id === e.target.value,
                    );
                    setConversationId(c?.id);
                    setHistory(c?.messages || []);
                    setReply(null);
                    setNotice("");
                  }}
                >
                  <option value="">Select saved conversation</option>
                  {conversations.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
                {conversationId && (
                  <button
                    className="icon-button"
                    disabled={busy}
                    title="Delete current conversation"
                    onClick={() => {
                      if (confirm("Delete this saved conversation?"))
                        void run(async () => {
                          await api(
                            "conversations/" + conversationId,
                            "DELETE",
                          );
                          setConversations(await api("conversations"));
                          setConversationId(undefined);
                          setHistory([]);
                          setReply(null);
                        });
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">A CONNECTION AWAY</span>
                  <h1>
                    Your next idea starts
                    <br />
                    with someone you know<span className="accent">.</span>
                  </h1>
                  <p>Find the right person in the network you already have.</p>
                </div>
                <button
                  className="secondary"
                  onClick={() => {
                    setView("contacts");
                    setEditing({ ...emptyContact });
                  }}
                >
                  <Plus size={16} />
                  Add contact
                </button>
              </div>
              <section className="search-panel">
                <div className="search-panel-top">
                  <span className="panel-icon">
                    <Search size={22} />
                  </span>
                  <div>
                    <h2>Who are you looking for?</h2>
                    <p>Ask about a skill, a place, or a shared interest.</p>
                  </div>
                  <span className="tag">
                    {useAi ? "AI-assisted" : "Ordinary search"}
                  </span>
                </div>
                <form onSubmit={(e) => void search(e)}>
                  <label className="sr-only" htmlFor="network-query">
                    Search your saved network
                  </label>
                  <textarea
                    id="network-query"
                    value={query}
                    maxLength={2000}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="I want to explore art in Wichita Falls. Who do I know?"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void search();
                      }
                    }}
                  />
                  <div className="composer-bottom">
                    <span className="small muted">
                      <ShieldCheck size={14} />
                      {useAi
                        ? "Selected facts go to your configured provider"
                        : "Searches only your saved contacts"}
                    </span>
                    <button
                      className="send primary"
                      aria-label="Search network"
                      disabled={busy || !query.trim()}
                    >
                      {busy ? (
                        <LoaderCircle size={20} className="spin" />
                      ) : (
                        <ArrowUp size={20} />
                      )}
                    </button>
                  </div>
                </form>
                <label className="ai-toggle">
                  <input
                    type="checkbox"
                    checked={useAi}
                    disabled={
                      !configuration.configured || !configuration.consent
                    }
                    onChange={(e) => setUseAi(e.target.checked)}
                  />
                  Use configured AI
                  {!configuration.consent && (
                    <span> · Enable with consent in Settings</span>
                  )}
                </label>
              </section>
              {!history.length && !reply && (
                <>
                  <div className="suggestions">
                    {[
                      "Who knows about art?",
                      "Anyone in Wichita Falls?",
                      "Who can help with programming?",
                    ].map((s) => (
                      <button key={s} onClick={() => void search(undefined, s)}>
                        {s}
                        <ArrowUpRight size={14} />
                      </button>
                    ))}
                  </div>
                  <div className="section-heading">
                    <h2>A little context goes a long way</h2>
                    <span className="muted small">
                      Built around your real connections
                    </span>
                  </div>
                  <div className="context-grid">
                    <article className="context-card">
                      <span className="number">01</span>
                      <Users size={22} />
                      <h3>Keep your people close</h3>
                      <p>
                        Add the people, communities, and businesses you want to
                        remember.
                      </p>
                      <button
                        className="text-button"
                        onClick={() => {
                          setView("contacts");
                          setEditing({ ...emptyContact });
                        }}
                      >
                        Add your first connection
                        <ArrowUpRight size={15} />
                      </button>
                    </article>
                    <article className="context-card">
                      <span className="number">02</span>
                      <MessageSquare size={22} />
                      <h3>Ask a better question</h3>
                      <p>
                        Search what they know, where they are, and how your
                        paths crossed.
                      </p>
                    </article>
                    <article className="context-card">
                      <span className="number">03</span>
                      <ShieldCheck size={22} />
                      <h3>Your network stays yours</h3>
                      <p>
                        Self-hosted storage. Optional AI. No scraping, tracking,
                        or automatic outreach.
                      </p>
                    </article>
                  </div>
                </>
              )}
              {history.length > 0 && (
                <section className="history" aria-label="Saved conversation">
                  {history.slice(-8).map((m, i) => (
                    <div key={i} className={"message " + m.role}>
                      <span className="eyebrow">
                        {m.role === "user" ? "YOU" : "NETPRO"}
                      </span>
                      <p>{m.text}</p>
                      {m.role === "assistant" && m.ids.length > 0 && (
                        <div className="methods">
                          {m.ids.map((id) => {
                            const c = all.find((c) => c.id === id);
                            return c ? (
                              <a
                                className="method"
                                href={"/contacts/" + id}
                                key={id}
                              >
                                {c.name}
                                <ArrowUpRight size={12} />
                              </a>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </section>
              )}
              {reply && (
                <section className="results" aria-live="polite">
                  <div className="section-heading">
                    <h2>
                      {reply.matches.length
                        ? "Your network, surfaced"
                        : "No clear match in your saved network."}
                    </h2>
                    <span className="tag">
                      {reply.mode === "ai"
                        ? "Validated AI selection"
                        : "Ordinary search"}
                    </span>
                  </div>
                  {reply.warning && <p className="banner">{reply.warning}</p>}
                  {!reply.matches.length && (
                    <p className="muted">
                      Try a broader skill or interest, or add more details to
                      your contacts.
                    </p>
                  )}
                  {[false, true].map((tentative) => {
                    const matches = reply.matches.filter(
                      (m) => m.tentative === tentative,
                    );
                    return matches.length ? (
                      <div key={String(tentative)}>
                        <h3 className="result-label">
                          {tentative
                            ? "Tentative possibilities"
                            : "Direct matches"}
                        </h3>
                        {tentative && (
                          <p className="small muted">
                            There is a recorded connection to your topic, but
                            expertise or location may be unconfirmed.
                          </p>
                        )}
                        <div className="results-grid">
                          {matches.map((m) => (
                            <article
                              className="contact-card"
                              key={m.contact.id}
                            >
                              <div className="contact-title">
                                <Initials name={m.contact.name} />
                                <div>
                                  <h3>
                                    <a href={"/contacts/" + m.contact.id}>
                                      {m.contact.name}
                                    </a>
                                  </h3>
                                  <span className="small muted">
                                    {m.contact.type} ·{" "}
                                    {m.contact.location ||
                                      "Location not recorded"}
                                  </span>
                                </div>
                                {m.contact.favorite && (
                                  <Star size={16} className="accent" />
                                )}
                              </div>
                              <div className="evidence">
                                {m.evidence.map((f) => (
                                  <p key={f}>
                                    <strong>{labels[f]}:</strong> {m.contact[f]}
                                  </p>
                                ))}
                              </div>
                              {tentative && (
                                <p className="limitation">
                                  Interest does not establish expertise. Confirm
                                  suitability and any missing local knowledge
                                  with this contact.
                                </p>
                              )}
                              <ContactLinks contact={m.contact} />
                              <a
                                className="profile-link"
                                href={"/contacts/" + m.contact.id}
                              >
                                Full profile
                                <ArrowUpRight size={14} />
                              </a>
                            </article>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })}
                </section>
              )}
              <footer className="page-footer">
                Network like a pro. Connect like a person.
                <span>{all.length} saved contacts</span>
              </footer>
            </>
          )}
          {view === "contacts" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">PEOPLE & POSSIBILITIES</span>
                  <h1>
                    {current ? current.name : "Your network"}
                    <span className="accent">.</span>
                  </h1>
                  <p>
                    {current
                      ? "The details that make a connection meaningful."
                      : "A home for the connections worth remembering."}
                  </p>
                </div>
                <button
                  className="primary"
                  onClick={() =>
                    setEditing(
                      current
                        ? {
                            ...current,
                            methods: current.methods.map((m) => ({ ...m })),
                          }
                        : {
                            ...emptyContact,
                            methods: [{ type: "email", value: "" }],
                          },
                    )
                  }
                >
                  <Plus size={16} />
                  {current ? "Edit contact" : "Add contact"}
                </button>
              </div>
              {selected && !current && (
                <p className="banner">This contact is no longer available.</p>
              )}
              {current ? (
                <section className="profile-panel">
                  <button
                    className="text-button"
                    onClick={() => {
                      setSelected("");
                      historyReplace();
                    }}
                  >
                    ← Back to directory
                  </button>
                  <div className="contact-title">
                    <Initials name={current.name} />
                    <div>
                      <h2>{current.name}</h2>
                      <p className="muted">
                        {current.type}
                        {current.favorite ? " · Favorite" : ""}
                      </p>
                    </div>
                  </div>
                  <ContactLinks contact={current} />
                  <dl className="profile-details">
                    {Object.keys(labels)
                      .filter(
                        (k) =>
                          k !== "background" &&
                          k !== "name" &&
                          current[k as keyof Contact],
                      )
                      .map((k) => (
                        <div key={k}>
                          <dt>{labels[k]}</dt>
                          <dd>{String(current[k as keyof Contact])}</dd>
                        </div>
                      ))}
                  </dl>
                  <button
                    className="danger"
                    disabled={busy}
                    onClick={() => {
                      if (confirm("Permanently delete " + current.name + "?"))
                        void run(async () => {
                          await api("contacts/" + current.id, "DELETE");
                          setAll(await api("contacts"));
                          setSelected("");
                          historyReplace();
                          setNotice("Contact deleted.");
                        });
                    }}
                  >
                    <Trash2 size={16} />
                    Delete contact
                  </button>
                </section>
              ) : (
                <>
                  <div className="directory-toolbar">
                    <div className="directory-search">
                      <Search size={18} />
                      <input
                        aria-label="Search contacts"
                        placeholder="Search name, place, interests, notes…"
                        value={directoryQuery}
                        onChange={(e) => setDirectoryQuery(e.target.value)}
                      />
                    </div>
                    <select
                      aria-label="Filter contacts"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="all">All contacts</option>
                      <option value="favorite">Favorites</option>
                      {["person", "organization", "business", "online"].map(
                        (v) => (
                          <option key={v}>{v}</option>
                        ),
                      )}
                    </select>
                  </div>
                  <div className="results-grid directory">
                    {all
                      .filter(
                        (c) =>
                          (filter === "all" ||
                            (filter === "favorite" && c.favorite) ||
                            c.type === filter) &&
                          JSON.stringify(c)
                            .toLowerCase()
                            .includes(directoryQuery.toLowerCase()),
                      )
                      .map((c) => (
                        <article className="contact-card" key={c.id}>
                          <div className="contact-title">
                            <Initials name={c.name} />
                            <div>
                              <h3>
                                <a href={"/contacts/" + c.id}>{c.name}</a>
                              </h3>
                              <span className="muted small">{c.type}</span>
                            </div>
                            {c.favorite && (
                              <Star size={15} className="accent" />
                            )}
                          </div>
                          <p>
                            {c.occupation ||
                              c.organization ||
                              c.interests ||
                              "Add a little context to remember this connection."}
                          </p>
                          <p className="muted small">
                            {c.location || "Location not recorded"}
                          </p>
                          {c.tags && <span className="tag">{c.tags}</span>}
                          <ContactLinks contact={c} />
                          <a
                            className="profile-link"
                            href={"/contacts/" + c.id}
                          >
                            Full profile
                            <ArrowUpRight size={14} />
                          </a>
                        </article>
                      ))}
                  </div>
                  {!all.length && (
                    <div className="empty">
                      <Users size={36} />
                      <h2>Your network starts with one connection.</h2>
                      <p>
                        Add a contact to start searching your saved network.
                      </p>
                      <button
                        className="primary"
                        onClick={() => setEditing({ ...emptyContact })}
                      >
                        Add a contact
                        <Plus size={16} />
                      </button>
                    </div>
                  )}
                  {all.length > 0 &&
                    !all.some(
                      (c) =>
                        (filter === "all" ||
                          (filter === "favorite" && c.favorite) ||
                          c.type === filter) &&
                        JSON.stringify(c)
                          .toLowerCase()
                          .includes(directoryQuery.toLowerCase()),
                    ) && (
                      <div className="empty">
                        <h2>No contacts match these filters.</h2>
                        <button
                          onClick={() => {
                            setDirectoryQuery("");
                            setFilter("all");
                          }}
                        >
                          Clear filters
                        </button>
                      </div>
                    )}
                </>
              )}
            </>
          )}
          {view === "settings" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">YOUR WORKSPACE, YOUR RULES</span>
                  <h1>
                    Make it yours<span className="accent">.</span>
                  </h1>
                  <p>
                    Your profile, your provider, and your privacy preferences.
                  </p>
                </div>
              </div>
              <section className="settings-panel">
                <h2>Owner profile</h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      await api("profile", "PUT", profile);
                      setNotice("Profile saved.");
                    });
                  }}
                >
                  <div className="form-grid">
                    {Object.keys(profile).map((k) => (
                      <Field key={k} label={k === "name" ? "Name" : labels[k]}>
                        <input
                          required={k === "name"}
                          maxLength={k === "name" ? 120 : 2000}
                          value={profile[k as keyof Profile]}
                          onChange={(e) =>
                            setProfile({ ...profile, [k]: e.target.value })
                          }
                        />
                      </Field>
                    ))}
                  </div>
                  <button disabled={busy} className="secondary">
                    Save profile
                  </button>
                </form>
              </section>
              <section className="settings-panel">
                <h2>Optional AI provider</h2>
                <p>
                  Credentials are encrypted on the server and never sent back to
                  your browser. Ordinary search works without AI.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const data = new FormData(form);
                    void run(async () => {
                      setConfiguration(
                        await api("settings", "PUT", {
                          provider: data.get("provider"),
                          model: data.get("model"),
                          endpoint:
                            data.get("endpoint") || configuration.endpoint,
                          apiKey: data.get("apiKey") || undefined,
                        }),
                      );
                      (
                        form.elements.namedItem("apiKey") as HTMLInputElement
                      ).value = "";
                      setUseAi(false);
                      setNotice(
                        "Provider saved. Review consent before using AI.",
                      );
                    });
                  }}
                >
                  <div className="form-grid">
                    <Field label="Provider">
                      <select
                        name="provider"
                        value={providerDraft}
                        onChange={(e) =>
                          setProviderDraft(
                            e.target.value as SettingsValue["provider"],
                          )
                        }
                      >
                        <option value="openai">OpenAI</option>
                        <option value="gemini">Google Gemini</option>
                        <option value="custom">OpenAI-compatible</option>
                      </select>
                    </Field>
                    <Field label="Model identifier">
                      <input
                        name="model"
                        required
                        maxLength={120}
                        placeholder="e.g. gpt-4.1-mini"
                        defaultValue={configuration.model}
                        key={configuration.model}
                      />
                    </Field>
                    <Field
                      label={
                        "API key · " +
                        (configuration.configured
                          ? "configured ••••••••"
                          : "not configured")
                      }
                    >
                      <input
                        type="password"
                        name="apiKey"
                        maxLength={500}
                        autoComplete="off"
                        placeholder="Leave blank to keep existing key"
                      />
                    </Field>
                    {providerDraft === "custom" && (
                      <Field label="Custom base endpoint · HTTPS">
                        <input
                          name="endpoint"
                          required
                          type="url"
                          defaultValue={configuration.endpoint}
                        />
                      </Field>
                    )}
                  </div>
                  <div className="button-row">
                    <button className="secondary" disabled={busy}>
                      Save provider
                    </button>
                    <button
                      type="button"
                      disabled={
                        busy ||
                        !configuration.configured ||
                        !configuration.consent
                      }
                      onClick={() =>
                        void run(async () => {
                          await api("test", "POST", {});
                          setNotice("Live provider connection verified.");
                        })
                      }
                    >
                      Test connection
                    </button>
                    <button
                      type="button"
                      className="danger"
                      disabled={busy || !configuration.configured}
                      onClick={() =>
                        void run(async () => {
                          setConfiguration(
                            await api("settings", "PUT", {
                              ...configuration,
                              removeKey: true,
                            }),
                          );
                          setUseAi(false);
                          setNotice("Credentials removed and consent revoked.");
                        })
                      }
                    >
                      Remove key
                    </button>
                  </div>
                </form>
                <div className="consent">
                  <ShieldCheck size={24} />
                  <div>
                    <h3>
                      {configuration.consent
                        ? "Cloud AI consent is enabled"
                        : "Cloud AI is disabled"}
                    </h3>
                    <p>
                      AI receives your query, limited follow-up context, your
                      owner profile, and selected skills, interests, location,
                      relationship details and notes. Contact methods are
                      omitted and recognizable emails, phones and links are
                      redacted from text.
                    </p>
                    <p>
                      Destination: <strong>{configuration.provider}</strong> ·{" "}
                      {configuration.endpoint}. Processing and retention depend
                      on this provider’s policies. Notes may contain sensitive
                      information; review them before consenting. Changing the
                      provider or endpoint requires new consent.
                    </p>
                    <button
                      disabled={busy || !configuration.configured}
                      className={
                        configuration.consent ? "secondary" : "primary"
                      }
                      onClick={() =>
                        void run(async () => {
                          setConfiguration(
                            await api("consent", "POST", {
                              consent: !configuration.consent,
                            }),
                          );
                          setUseAi(false);
                          setNotice(
                            configuration.consent
                              ? "Consent revoked."
                              : "Consent enabled for the saved destination.",
                          );
                        })
                      }
                    >
                      {configuration.consent
                        ? "Revoke consent"
                        : "I consent to this data being sent"}
                    </button>
                  </div>
                </div>
              </section>
              <section className="settings-panel">
                <h2>Private backup & restore</h2>
                <p>
                  Versioned JSON includes your profile and contacts. Credentials
                  and sessions are always excluded. Keep downloaded backups
                  private.
                </p>
                <div className="button-row">
                  <button
                    onClick={() =>
                      void run(async () => {
                        const b = await api("export");
                        download(b);
                      })
                    }
                  >
                    <Download size={16} />
                    Export contacts & profile
                  </button>
                  <button
                    onClick={() =>
                      void run(async () => {
                        download(await api("export?chats=true"));
                      })
                    }
                  >
                    Export including chats
                  </button>
                </div>
                <Field label="Import a NetPro JSON backup">
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f)
                        void run(async () => {
                          if (f.size > 1900000)
                            throw new Error("Backup exceeds 1.9 MB.");
                          const data = JSON.parse(await f.text());
                          const summary = await api("import", "POST", {
                            action: "preview",
                            backup: data,
                          });
                          setImportData(data);
                          setSummary(summary);
                        });
                    }}
                  />
                </Field>
                {summary && (
                  <div className="consent">
                    <div>
                      <h3>
                        Preview: {summary.contacts} contacts ·{" "}
                        {summary.conversations} conversations
                      </h3>
                      <p>
                        Owner profile: {summary.profile}. Replacement deletes
                        existing contacts and chats. A private recovery backup
                        is saved first; login and AI settings stay intact.
                      </p>
                      <button
                        disabled={busy}
                        className="danger"
                        onClick={() => {
                          if (
                            prompt(
                              "Type REPLACE to replace existing contacts, profile, and chats.",
                            ) === "REPLACE"
                          )
                            void run(async () => {
                              const result = await api("import", "POST", {
                                action: "replace",
                                confirmation: "REPLACE",
                                backup: importData,
                              });
                              await load();
                              setSummary(undefined);
                              setNotice(
                                "Restored. Recovery backup: " + result.backup,
                              );
                            });
                        }}
                      >
                        Replace existing data
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
      {editing && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditing(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-editor-title"
            className="modal"
            onKeyDown={(e) => {
              if (e.key === "Escape") setEditing(null);
              if (e.key === "Tab") {
                const els = Array.from(
                  e.currentTarget.querySelectorAll<HTMLElement>(
                    "button:not([disabled]), input, textarea, select, a[href]",
                  ),
                );
                const first = els[0],
                  last = els.at(-1);
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last?.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first?.focus();
                }
              }
            }}
          >
            <div className="section-heading">
              <h2 id="contact-editor-title">
                {editing.id ? "Edit connection" : "Add a connection"}
              </h2>
              <button
                className="icon-button"
                title="Close editor"
                onClick={() => setEditing(null)}
              >
                <X />
              </button>
            </div>
            <p className="muted">
              A name and one way to reach them are all you need.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  const result = await api(
                    "contacts" + (editing.id ? "/" + editing.id : ""),
                    editing.id ? "PUT" : "POST",
                    editing,
                  );
                  setAll(await api("contacts"));
                  setEditing(null);
                  setNotice(
                    result.duplicates.length
                      ? "Saved. Possible duplicates: " +
                          result.duplicates
                            .map((c: Contact) => c.name)
                            .join(", ") +
                          ". Review them in your directory."
                      : "Contact saved.",
                  );
                });
              }}
            >
              <div className="form-grid">
                <Field label="Name *">
                  <input
                    autoFocus
                    required
                    maxLength={120}
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                  />
                </Field>
                <Field label="Contact type">
                  <select
                    value={editing.type}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        type: e.target.value as Contact["type"],
                      })
                    }
                  >
                    {["person", "organization", "business", "online"].map(
                      (t) => (
                        <option key={t}>{t}</option>
                      ),
                    )}
                  </select>
                </Field>
              </div>
              <h3>Contact methods *</h3>
              {editing.methods.map((m, i) => (
                <div className="method-editor" key={i}>
                  <select
                    aria-label={"Method " + (i + 1) + " type"}
                    value={m.type}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        methods: editing.methods.map((v, j) =>
                          j === i
                            ? { ...v, type: e.target.value as typeof m.type }
                            : v,
                        ),
                      })
                    }
                  >
                    {["email", "phone", "social", "website", "custom"].map(
                      (t) => (
                        <option key={t}>{t}</option>
                      ),
                    )}
                  </select>
                  <input
                    aria-label={"Method " + (i + 1) + " value"}
                    type={
                      m.type === "email"
                        ? "email"
                        : ["social", "website"].includes(m.type)
                          ? "url"
                          : "text"
                    }
                    value={m.value}
                    required
                    maxLength={500}
                    placeholder={
                      m.type === "custom"
                        ? "Through the university club"
                        : "Contact detail"
                    }
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        methods: editing.methods.map((v, j) =>
                          j === i ? { ...v, value: e.target.value } : v,
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    title="Remove method"
                    className="icon-button"
                    disabled={editing.methods.length === 1}
                    onClick={() =>
                      setEditing({
                        ...editing,
                        methods: editing.methods.filter((_, j) => j !== i),
                      })
                    }
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="text-button"
                disabled={editing.methods.length >= 12}
                onClick={() =>
                  setEditing({
                    ...editing,
                    methods: [
                      ...editing.methods,
                      { type: "custom", value: "" },
                    ],
                  })
                }
              >
                <Plus size={14} />
                Add another method
              </button>
              <div className="form-grid">
                {Object.keys(labels)
                  .filter((k) => k !== "background" && k !== "name")
                  .map((k) => (
                    <Field key={k} label={labels[k]}>
                      {["notes", "met", "interactionNotes"].includes(k) ? (
                        <textarea
                          maxLength={2000}
                          value={String(editing[k as keyof Contact])}
                          onChange={(e) =>
                            setEditing({ ...editing, [k]: e.target.value })
                          }
                        />
                      ) : (
                        <input
                          type={k === "lastInteraction" ? "date" : "text"}
                          maxLength={2000}
                          value={String(editing[k as keyof Contact])}
                          onChange={(e) =>
                            setEditing({ ...editing, [k]: e.target.value })
                          }
                        />
                      )}
                    </Field>
                  ))}
              </div>
              <label className="ai-toggle">
                <input
                  type="checkbox"
                  checked={editing.favorite}
                  onChange={(e) =>
                    setEditing({ ...editing, favorite: e.target.checked })
                  }
                />
                Favorite connection
              </label>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <div className="button-row">
                <button className="primary" disabled={busy}>
                  Save contact
                  <ArrowUpRight size={16} />
                </button>
                <button type="button" onClick={() => setEditing(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function download(data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "netpro-private-backup.json";
  anchor.click();
  URL.revokeObjectURL(url);
}
function historyReplace() {
  window.history.replaceState({}, "", "/");
}
