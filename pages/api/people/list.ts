import type { NextApiRequest, NextApiResponse } from "next";
import { asc, eq } from "drizzle-orm";
import { db } from "../../../lib/db/client";
import { people } from "../../../src/db/schema/people";

/**
 * GET /api/people/list
 * Returns simplified people list for iOS Shortcut
 * Response: [{ personId, fullName }]
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const database = db;

  if (!database) {
    console.error("Database connection is not configured");
    res.status(500).json({ error: "Database connection is not configured" });
    return;
  }

  if (req.method === "GET") {
    try {
      const result = await database
        .select({
          personId: people.personId,
          fullName: people.fullName,
        })
        .from(people)
        .where(eq(people.status, "active"))
        .orderBy(asc(people.fullName));
      
      res.status(200).json(result);
    } catch (error) {
      console.error("Failed to fetch people list", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
    return;
  }

  res.setHeader("Allow", ["GET"]);
  res.status(405).json({ error: "Method not allowed" });
}
