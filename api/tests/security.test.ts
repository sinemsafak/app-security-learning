
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

let app: (typeof import("express"))["default"] extends never ? never : any;
let db: any;

process.env.JWT_SECRET = "test-only-secret-value-0123456789abcdef";
process.env.DB_PATH = ":memory:";

beforeAll(async () => {
  const server = await import("../src/server.js");
  const database = await import("../src/db.js");
  app = server.createApp();
  db = database.db;
});

beforeEach(() => {
  db.exec("DELETE FROM private_notes; DELETE FROM users;");
});

async function register(email: string, displayName: string) {
  const response = await request(app)
    .post("/api/auth/register")
    .send({ email, password: "Test-Password-123!", displayName });

  expect(response.status).toBe(201);
  return response.body as {
    user: { id: string; email: string; displayName: string };
    accessToken: string;
  };
}

async function createNote(token: string, content: string) {
  return request(app)
    .post("/api/notes")
    .set("Authorization", `Bearer ${token}`)
    .send({ content });
}

describe("API security", () => {
  it("rejects unauthenticated access to private notes", async () => {
    const response = await request(app).get("/api/notes");
    expect(response.status).toBe(401);
  });

  it("rejects an incorrect password", async () => {
    await register("alice@example.test", "Alice");

    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "alice@example.test",
        password: "Wrong-Password-123!"
      });

    expect(response.status).toBe(401);
  });

  it("lets a user read their own notes", async () => {
    const alice = await register("alice@example.test", "Alice");
    await createNote(alice.accessToken, "Alice private note");

    const response = await request(app)
      .get("/api/notes")
      .set("Authorization", `Bearer ${alice.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.notes).toHaveLength(1);
    expect(response.body.notes[0].content).toBe("Alice private note");
  });

  it("does not return another user's private notes", async () => {
    const alice = await register("alice@example.test", "Alice");
    const bob = await register("bob@example.test", "Bob");

    await createNote(bob.accessToken, "Bob private note");

    const response = await request(app)
      .get("/api/notes")
      .set("Authorization", `Bearer ${alice.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.notes).toHaveLength(0);
    expect(JSON.stringify(response.body)).not.toContain("Bob private note");
  });

  it("prevents updating another user's note", async () => {
    const alice = await register("alice@example.test", "Alice");
    const bob = await register("bob@example.test", "Bob");

    const created = await createNote(bob.accessToken, "Original private note");
    const noteId = created.body.note.id;

    const response = await request(app)
      .put(`/api/notes/${noteId}`)
      .set("Authorization", `Bearer ${alice.accessToken}`)
      .send({ content: "Stolen update" });

    expect(response.status).toBe(404);

    const bobNotes = await request(app)
      .get("/api/notes")
      .set("Authorization", `Bearer ${bob.accessToken}`);

    expect(bobNotes.body.notes[0].content).toBe("Original private note");
  });

  it("prevents deleting another user's note", async () => {
    const alice = await register("alice@example.test", "Alice");
    const bob = await register("bob@example.test", "Bob");

    const created = await createNote(bob.accessToken, "Keep this note");

    const response = await request(app)
      .delete(`/api/notes/${created.body.note.id}`)
      .set("Authorization", `Bearer ${alice.accessToken}`);

    expect(response.status).toBe(404);
  });

  it("does not expose email on public profiles", async () => {
    const alice = await register("alice@example.test", "Alice");

    const response = await request(app)
      .get(`/api/profiles/${alice.user.id}`);

    expect(response.status).toBe(200);
    expect(response.body.profile.displayName).toBe("Alice");
    expect(response.body.profile).not.toHaveProperty("email");
  });

  it("rejects unexpected registration fields", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        email: "alice@example.test",
        password: "Test-Password-123!",
        displayName: "Alice",
        role: "admin"
      });

    expect(response.status).toBe(400);
  });

  it("stores password hashes rather than plaintext", async () => {
    const alice = await register("alice@example.test", "Alice");

    const stored = db.prepare(
      "SELECT password_hash FROM users WHERE id = ?"
    ).get(alice.user.id) as { password_hash: string };

    expect(stored.password_hash).not.toBe("Test-Password-123!");
    expect(stored.password_hash.startsWith("$argon2")).toBe(true);
  });
});
