import type { NextApiRequest, NextApiResponse } from "next";

import { fetchTransactions } from "../../../lib/api/transactions/repository";
import { parseTransactionsQuery } from "../../../lib/api/transactions/query";
import { serializeTransactionRecord } from "../../../lib/api/transactions/transform";

type ErrorResponse = { error: string };

const METHOD_NOT_ALLOWED = "GET,POST,PATCH,DELETE";

const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  const params = parseTransactionsQuery(req.query);
  const transactions = await fetchTransactions(params);
  const payload = transactions.map(serializeTransactionRecord);
  res.status(200).json(payload);
};

const handlePost = async (req: NextApiRequest, res: NextApiResponse) => {
  // TODO(sprint3-be-3a): Persist incoming transaction and optional cashback rows into Neon via Drizzle once the DB connection is available.
  res.status(202).json({
    status: "accepted",
    message:
      "Transaction creation stubbed. Wire this endpoint to Neon via Drizzle once DATABASE_URL is configured.",
    received: req.body ?? null,
  });
};

const handlePatch = async (req: NextApiRequest, res: NextApiResponse) => {
  // TODO(sprint3-be-3a): Implement transactional update with validation + cashback recalculation hooks.
  res.status(202).json({
    status: "accepted",
    message:
      "Transaction update stubbed. Integrate with Neon/Drizzle and enforce business rules before enabling.",
    received: req.body ?? null,
  });
};

const handleDelete = async (req: NextApiRequest, res: NextApiResponse) => {
  // TODO(sprint3-be-3a): Enforce soft-delete / archival strategy when removing transactions once DB is connected.
  res.status(202).json({
    status: "accepted",
    message:
      "Transaction delete stubbed. Implement archival or soft-delete strategy before enabling destructive actions.",
  });
};

const transactionsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<unknown | ErrorResponse>,
) => {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  try {
    if (req.method === "GET") {
      await handleGet(req, res);
      return;
    }
    if (req.method === "POST") {
      await handlePost(req, res);
      return;
    }
    if (req.method === "PATCH") {
      await handlePatch(req, res);
      return;
    }
    if (req.method === "DELETE") {
      await handleDelete(req, res);
      return;
    }

    res.setHeader("Allow", METHOD_NOT_ALLOWED);
    res.status(405).json({ error: "Method Not Allowed" });
  } catch (error) {
    console.error("[transactions.api] Failed to handle request", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export default transactionsHandler;
