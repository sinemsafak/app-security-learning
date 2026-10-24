
import { randomUUID } from "node:crypto";
import { Router } from "express";
import argon2 from "argon2";
import { z } from "zod";
import { db } from "./db.js";
import { createAccessToken, requireAuth } from "./auth.js";

export const router = Router();

const registerSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
  displayName: z.string().trim().min(1).max(80)
}).strict();

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128)
}).strict();

const noteSchema = z.object({
  content: z.string().trim().min(1).max(5000)
}).strict();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.post("/auth/register", async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid registration input." });
      return;
    }

    const email = parsed.data.email.toLowerCase();
    const existing = db.prepare(
      "SELECT id FROM users WHERE email = ?"
    ).get(email);

    if (existing) {
      res.status(409).json({ error: "Unable to register this email." });
      return;
    }

    const id = randomUUID();
    const passwordHash = await argon2.hash(parsed.data.password, {
      type: argon2.argon2id
    });

    db.prepare(`
      INSERT INTO users (id, email, password_hash, display_name)
      VALUES (?, ?, ?, ?)
    `).run(id, email, passwordHash, parsed.data.displayName);

    const user = {
      id,
      email,
      displayName: parsed.data.displayName
    };

    res.status(201).json({
      user,
      accessToken: createAccessToken(user)
    });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid login input." });
      return;
    }

    const user = db.prepare(`
      SELECT id, email, password_hash, display_name
      FROM users WHERE email = ?
    `).get(parsed.data.email.toLowerCase()) as
      | {
          id: string;
          email: string;
          password_hash: string;
          display_name: string;
        }
      | undefined;

    if (!user || !(await argon2.verify(
      user.password_hash,
      parsed.data.password
    ))) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const publicUser = {
      id: user.id,
      email: user.email,
      displayName: user.display_name
    };

    res.json({
      user: publicUser,
      accessToken: createAccessToken(publicUser)
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, (req, res) => {
  const user = db.prepare(`
    SELECT id, email, display_name AS displayName
    FROM users WHERE id = ?
  `).get(req.authUser!.id);

  if (!user) {
    res.status(401).json({ error: "Account no longer exists." });
    return;
  }

  res.json({ user });
});

router.get("/profiles/:id", (req, res) => {
  const user = db.prepare(`
    SELECT id, display_name AS displayName
    FROM users WHERE id = ?
  `).get(req.params.id);

  if (!user) {
    res.status(404).json({ error: "Profile not found." });
    return;
  }

  // Public profile deliberately excludes email and private notes.
  res.json({ profile: user });
});

router.get("/notes", requireAuth, (req, res) => {
  const notes = db.prepare(`
    SELECT id, content, created_at AS createdAt,
           updated_at AS updatedAt
    FROM private_notes
    WHERE owner_user_id = ?
    ORDER BY created_at DESC
  `).all(req.authUser!.id);

  res.json({ notes });
});

router.post("/notes", requireAuth, (req, res) => {
  const parsed = noteSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid note input." });
    return;
  }

  const id = randomUUID();

  db.prepare(`
    INSERT INTO private_notes (id, owner_user_id, content)
    VALUES (?, ?, ?)
  `).run(id, req.authUser!.id, parsed.data.content);

  res.status(201).json({
    note: { id, content: parsed.data.content }
  });
});

router.put("/notes/:id", requireAuth, (req, res) => {
  const parsed = noteSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid note input." });
    return;
  }

  const result = db.prepare(`
    UPDATE private_notes
    SET content = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND owner_user_id = ?
  `).run(parsed.data.content, req.params.id, req.authUser!.id);

  if (result.changes === 0) {
    res.status(404).json({ error: "Note not found." });
    return;
  }

  res.json({ status: "updated" });
});

router.delete("/notes/:id", requireAuth, (req, res) => {
  const result = db.prepare(`
    DELETE FROM private_notes
    WHERE id = ? AND owner_user_id = ?
  `).run(req.params.id, req.authUser!.id);

  if (result.changes === 0) {
    res.status(404).json({ error: "Note not found." });
    return;
  }

  res.status(204).end();
});
