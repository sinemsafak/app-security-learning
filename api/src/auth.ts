
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters.");
  }

  return secret;
}

export function createAccessToken(user: AuthUser): string {
  return jwt.sign(
    { email: user.email },
    getJwtSecret(),
    {
      subject: user.id,
      expiresIn: "15m",
      issuer: "app-security-learning",
      audience: "app-security-learning-clients"
    }
  );
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authorization = req.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const token = authorization.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, getJwtSecret(), {
      issuer: "app-security-learning",
      audience: "app-security-learning-clients",
      algorithms: ["HS256"]
    });

    if (typeof payload === "string" || !payload.sub) {
      res.status(401).json({ error: "Invalid access token." });
      return;
    }

    req.authUser = {
      id: payload.sub,
      email: typeof payload.email === "string" ? payload.email : "",
      displayName: ""
    };

    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired access token." });
  }
}
