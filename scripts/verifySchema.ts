import fs from "fs";
import path from "path";

import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

import { schemaExpectations, TableExpectation } from "./schemaExpectations";

dotenv.config();

const dbUrl = process.env.DB_URL;

if (!dbUrl) {
  console.error("❌ Cannot verify schema without DB_URL environment variable.");
  process.exit(1);
}

type ColumnRow = {
  column_name: string;
  data_type: string;
  is_nullable: "YES" | "NO";
  column_default: string | null;
  udt_name: string;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
  is_generated: "ALWAYS" | "NEVER";
};

type ConstraintRow = {
  constraint_name: string;
  columns: string[];
  foreign_table_name: string | null;
  foreign_columns: string[] | null;
  constraint_type: string;
};

type IndexRow = {
  indexname: string;
  indexdef: string;
};

type TableVerificationResult = {
  table: string;
  documentation?: string;
  status: "pass" | "fail";
  checkedColumns: number;
  foundColumns: number;
  issues: string[];
  warnings: string[];
};

const sql = neon(dbUrl);

const toColumnMap = (rows: ColumnRow[]): Map<string, ColumnRow> => {
  const map = new Map<string, ColumnRow>();
  for (const row of rows) {
    map.set(row.column_name, row);
  }
  return map;
};

const parseIndexColumns = (definition: string): string[] => {
  const match = definition.match(/\((.+)\)/);
  if (!match) {
    return [];
  }
  return match[1]
    .split(",")
    .map((part) => part.trim())
    .map((part) => part.replace(/"/g, ""))
    .map((part) => part.replace(/public\./g, ""));
};

const compareColumns = (expected: TableExpectation, actualMap: Map<string, ColumnRow>): string[] => {
  const issues: string[] = [];

  for (const [columnName, columnExpectation] of Object.entries(expected.columns)) {
    const column = actualMap.get(columnName);
    if (!column) {
      issues.push(`Missing column \`${columnName}\`.`);
      continue;
    }

    if (column.data_type !== columnExpectation.dataType) {
      issues.push(
        `Column \`${columnName}\` expected data type \`${columnExpectation.dataType}\` but found \`${column.data_type}\`.`,
      );
    }

    if (columnExpectation.udtName && column.udt_name !== columnExpectation.udtName) {
      issues.push(
        `Column \`${columnName}\` expected enum/UDT name \`${columnExpectation.udtName}\` but found \`${column.udt_name}\`.`,
      );
    }

    const actualNullable = column.is_nullable === "YES";
    if (actualNullable !== columnExpectation.isNullable) {
      issues.push(
        `Column \`${columnName}\` expected nullable=${columnExpectation.isNullable} but database reports nullable=${actualNullable}.`,
      );
    }

    if (typeof columnExpectation.maxLength === "number") {
      if (column.character_maximum_length !== columnExpectation.maxLength) {
        issues.push(
          `Column \`${columnName}\` expected length ${columnExpectation.maxLength} but found ${column.character_maximum_length}.`,
        );
      }
    }

    if (typeof columnExpectation.numericPrecision === "number") {
      if (column.numeric_precision !== columnExpectation.numericPrecision) {
        issues.push(
          `Column \`${columnName}\` expected precision ${columnExpectation.numericPrecision} but found ${column.numeric_precision}.`,
        );
      }
    }

    if (typeof columnExpectation.numericScale === "number") {
      if (column.numeric_scale !== columnExpectation.numericScale) {
        issues.push(
          `Column \`${columnName}\` expected scale ${columnExpectation.numericScale} but found ${column.numeric_scale}.`,
        );
      }
    }

    if (typeof columnExpectation.hasDefault === "boolean") {
      const hasDefault = column.column_default !== null;
      if (hasDefault !== columnExpectation.hasDefault) {
        issues.push(
          `Column \`${columnName}\` expected default presence ${columnExpectation.hasDefault} but found ${hasDefault}.`,
        );
      }
    }

    if (columnExpectation.isGenerated) {
      if (column.is_generated !== "ALWAYS") {
        issues.push(`Column \`${columnName}\` expected to be generated always, but database reports ${column.is_generated}.`);
      }
    }
  }

  return issues;
};

const fetchConstraints = async (tableName: string): Promise<ConstraintRow[]> => {
  const rows = await sql<ConstraintRow>`
    SELECT
      tc.constraint_name,
      tc.constraint_type,
      array_agg(kcu.column_name ORDER BY kcu.ordinal_position) AS columns,
      ccu.table_name AS foreign_table_name,
      array_agg(ccu.column_name ORDER BY kcu.ordinal_position) AS foreign_columns
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
      AND tc.table_schema = ccu.constraint_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = ${tableName}
    GROUP BY tc.constraint_name, tc.constraint_type, ccu.table_name
  `;
  return rows;
};

const fetchIndexes = async (tableName: string): Promise<IndexRow[]> => {
  return sql<IndexRow>`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = ${tableName}
  `;
};

const verifyTable = async (expectation: TableExpectation): Promise<TableVerificationResult> => {
  const columnRows = await sql<ColumnRow>`
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default,
      udt_name,
      character_maximum_length,
      numeric_precision,
      numeric_scale,
      is_generated
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${expectation.tableName}
    ORDER BY ordinal_position
  `;

  const issues: string[] = [];
  const warnings: string[] = [];

  if (columnRows.length === 0) {
    issues.push("Table does not exist in database.");
    return {
      table: expectation.tableName,
      documentation: expectation.documentation,
      status: "fail",
      checkedColumns: Object.keys(expectation.columns).length,
      foundColumns: 0,
      issues,
      warnings,
    };
  }

  const columnMap = toColumnMap(columnRows);
  issues.push(...compareColumns(expectation, columnMap));

  const unexpectedColumns = columnRows
    .map((row) => row.column_name)
    .filter((name) => !expectation.columns[name]);
  if (unexpectedColumns.length > 0) {
    warnings.push(`Unexpected columns present: ${unexpectedColumns.join(", ")}.`);
  }

  const constraints = await fetchConstraints(expectation.tableName);

  const pk = constraints.find((row) => row.constraint_type === "PRIMARY KEY");
  const expectedPk = expectation.primaryKey.join(",");
  const actualPk = pk ? pk.columns.join(",") : "";
  if (expectedPk !== actualPk) {
    issues.push(`Primary key mismatch. Expected [${expectedPk}] but found [${actualPk}].`);
  }

  const fkConstraints = constraints.filter((row) => row.constraint_type === "FOREIGN KEY");
  if (expectation.foreignKeys) {
    for (const fk of expectation.foreignKeys) {
      const match = fkConstraints.find(
        (row) =>
          row.columns.join(",") === fk.columns.join(",") &&
          row.foreign_table_name === fk.referencedTable &&
          (row.foreign_columns ?? []).join(",") === fk.referencedColumns.join(","),
      );
      if (!match) {
        issues.push(
          `Foreign key on columns [${fk.columns.join(", ")}] → ${fk.referencedTable}(${fk.referencedColumns.join(", ")}) missing.`,
        );
      }
    }
  }

  const indexes = await fetchIndexes(expectation.tableName);
  if (expectation.indexes) {
    for (const expectedIndex of expectation.indexes) {
      const indexRow = indexes.find((row) => row.indexname === expectedIndex.indexName);
      if (!indexRow) {
        issues.push(`Expected index \`${expectedIndex.indexName}\` was not found.`);
        continue;
      }
      const columns = parseIndexColumns(indexRow.indexdef);
      if (columns.join(",") !== expectedIndex.columns.join(",")) {
        issues.push(
          `Index \`${expectedIndex.indexName}\` expected columns [${expectedIndex.columns.join(", ")}], found [${columns.join(",")}].`,
        );
      }
      const isUnique = indexRow.indexdef.startsWith("CREATE UNIQUE INDEX");
      if (typeof expectedIndex.isUnique === "boolean" && isUnique !== expectedIndex.isUnique) {
        issues.push(
          `Index \`${expectedIndex.indexName}\` expected unique=${expectedIndex.isUnique} but database reports ${isUnique}.`,
        );
      }
    }
  }

  const status: "pass" | "fail" = issues.length === 0 ? "pass" : "fail";

  return {
    table: expectation.tableName,
    documentation: expectation.documentation,
    status,
    checkedColumns: Object.keys(expectation.columns).length,
    foundColumns: columnRows.length,
    issues,
    warnings,
  };
};

const buildMarkdownReport = (results: TableVerificationResult[]): string => {
  const lines: string[] = [];
  lines.push(`# Neon Schema Verification Report`);
  lines.push("");
  lines.push(`Generated at ${new Date().toISOString()}.`);
  lines.push("");

  for (const result of results) {
    lines.push(`## ${result.table}`);
    if (result.documentation) {
      lines.push(`- Documentation: [${result.documentation}](${result.documentation})`);
    } else {
      lines.push("- Documentation: _Not provided_");
    }
    lines.push(`- Status: **${result.status.toUpperCase()}**`);
    lines.push(`- Columns checked: ${result.checkedColumns}`);
    lines.push(`- Columns found: ${result.foundColumns}`);

    if (result.issues.length > 0) {
      lines.push("- Issues:");
      for (const issue of result.issues) {
        lines.push(`  - ${issue}`);
      }
    } else {
      lines.push("- Issues: None");
    }

    if (result.warnings.length > 0) {
      lines.push("- Warnings:");
      for (const warning of result.warnings) {
        lines.push(`  - ${warning}`);
      }
    } else {
      lines.push("- Warnings: None");
    }

    lines.push("");
  }

  return lines.join("\n");
};

const main = async () => {
  const results: TableVerificationResult[] = [];
  for (const expectation of schemaExpectations) {
    const result = await verifyTable(expectation);
    results.push(result);
    const statusIcon = result.status === "pass" ? "✅" : "❌";
    console.info(`${statusIcon} ${expectation.tableName}`);
    if (result.issues.length > 0) {
      for (const issue of result.issues) {
        console.info(`   - ${issue}`);
      }
    }
    if (result.warnings.length > 0) {
      for (const warning of result.warnings) {
        console.info(`   ⚠️ ${warning}`);
      }
    }
  }

  const markdown = buildMarkdownReport(results);
  const outputPath = path.resolve("docs", "neon-schema-verification.md");
  fs.writeFileSync(outputPath, markdown, "utf-8");
  console.info(`\n📄 Verification report written to ${outputPath}`);
};

main().catch((error) => {
  console.error("❌ Schema verification failed:", error);
  process.exit(1);
});
