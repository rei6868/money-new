import type { NextApiRequest, NextApiResponse } from "next";

import { getColumnMetadata } from "../../../lib/api/transactions/repository";

type ColumnsResponse = {
  columns: ReturnType<typeof getColumnMetadata>;
};

const columnsHandler = (req: NextApiRequest, res: NextApiResponse<ColumnsResponse>) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ columns: [] });
    return;
  }

  // TODO(sprint3-be-3a): Replace static metadata with automated schema introspection when Neon wiring is completed.
  res.setHeader("Cache-Control", "public, max-age=300");
  res.status(200).json({ columns: getColumnMetadata() });
};

export default columnsHandler;
