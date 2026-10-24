
import { useEffect, useState } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:3001/api";

type User = {
  id: string;
  email: string;
  displayName: string;
};

type Note = {
  id: string;
  content: string;
  createdAt?: string;
};

async function apiRequest<T>(
  path: string,
  token?: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${response.status})`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [newNote, setNewNote] = useState("");
  const [mode, setMode] = useState<"login" | "register">("register");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadNotes(accessToken: string) {
    const data = await apiRequest<{ notes: Note[] }>("/notes", accessToken);
    setNotes(data.notes);
  }

  useEffect(() => {
    if (!token) return;

    const accessToken = token;
    let cancelled = false;

    async function fetchNotes() {
      try {
        const data = await apiRequest<{ notes: Note[] }>(
          "/notes",
          accessToken
        );

        if (!cancelled) {
          setNotes(data.notes);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : "İstek başarısız."
          );
        }
      }
    }

    void fetchNotes();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function authenticate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const path =
        mode === "register" ? "/auth/register" : "/auth/login";

      const payload =
        mode === "register"
          ? { email, password, displayName }
          : { email, password };

      const data = await apiRequest<{
        user: User;
        accessToken: string;
      }>(path, undefined, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setUser(data.user);
      setToken(data.accessToken);
      setPassword("");
      setMessage("Giriş başarılı.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "İstek başarısız."
      );
    } finally {
      setBusy(false);
    }
  }

  async function addNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !newNote.trim()) return;

    try {
      await apiRequest("/notes", token, {
        method: "POST",
        body: JSON.stringify({ content: newNote }),
      });

      setNewNote("");
      await loadNotes(token);
      setMessage("Not kaydedildi.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "İstek başarısız."
      );
    }
  }

  async function deleteNote(id: string) {
    if (!token) return;

    try {
      await apiRequest(
        `/notes/${encodeURIComponent(id)}`,
        token,
        { method: "DELETE" }
      );

      await loadNotes(token);
      setMessage("Not silindi.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "İstek başarısız."
      );
    }
  }

  function logout() {
    setToken(null);
    setUser(null);
    setNotes([]);
    setPassword("");
    setNewNote("");
    setMessage("Oturum kapatıldı.");
  }

  return (
    <main className="container">
      <header>
        <p className="eyebrow">APP SECURITY LEARNING</p>
        <h1>Güvenli profil uygulaması</h1>
        <p>
          Özel notlar yalnızca sunucuda doğrulanan hesap sahibine açıktır.
        </p>
      </header>

      <p role="status" aria-live="polite">
        {message}
      </p>

      {!token ? (
        <section className="panel">
          <h2>{mode === "register" ? "Hesap oluştur" : "Giriş yap"}</h2>

          <form onSubmit={authenticate}>
            <label>
              E-posta
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                maxLength={254}
              />
            </label>

            {mode === "register" && (
              <label>
                Görünen ad
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  autoComplete="name"
                  required
                  maxLength={80}
                />
              </label>
            )}

            <label>
              Parola (en az 12 karakter)
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
                minLength={mode === "register" ? 12 : 1}
                maxLength={128}
                required
              />
            </label>

            <button type="submit" disabled={busy}>
              {busy
                ? "İşleniyor..."
                : mode === "register"
                  ? "Kayıt ol"
                  : "Giriş yap"}
            </button>
          </form>

          <button
            type="button"
            className="secondary"
            onClick={() => {
              setMode(mode === "register" ? "login" : "register");
              setMessage("");
            }}
          >
            {mode === "register"
              ? "Zaten hesabım var"
              : "Yeni hesap oluştur"}
          </button>
        </section>
      ) : (
        <section className="panel">
          <div className="heading-row">
            <h2>Profilim</h2>
            <button
              type="button"
              className="secondary"
              onClick={logout}
            >
              Çıkış yap
            </button>
          </div>

          <p>
            <strong>Görünen ad:</strong> {user?.displayName}
          </p>
          <p>
            <strong>E-posta:</strong> {user?.email}
          </p>

          <h2>Özel notlarım</h2>

          <form onSubmit={addNote}>
            <label>
              Yeni not
              <textarea
                value={newNote}
                onChange={(event) => setNewNote(event.target.value)}
                maxLength={5000}
                required
              />
            </label>

            <button type="submit">Not ekle</button>
          </form>

          {notes.length === 0 ? (
            <p>Henüz özel not yok.</p>
          ) : (
            <ul className="notes">
              {notes.map((note) => (
                <li key={note.id}>
                  <span>{note.content}</span>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => deleteNote(note.id)}
                    aria-label="Notu sil"
                  >
                    Sil
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <footer>
        Bu demo eğitim amaçlıdır. İstemci tarafındaki kontroller,
        sunucu tarafındaki güvenlik kontrollerinin yerini tutmaz.
      </footer>
    </main>
  );
}
