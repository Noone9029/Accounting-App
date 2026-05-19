import { databaseUrlForPrismaRuntime } from "./prisma.service";

describe("databaseUrlForPrismaRuntime", () => {
  it("uses the Supabase transaction pooler for Vercel runtime traffic", () => {
    const output = databaseUrlForPrismaRuntime({
      DATABASE_URL: "postgresql://prisma.project-ref:secret@aws-0-region.pooler.supabase.com:5432/postgres",
      VERCEL: "1",
    });

    expect(output).toBeDefined();
    const url = new URL(output as string);
    expect(url.hostname).toBe("aws-0-region.pooler.supabase.com");
    expect(url.port).toBe("6543");
    expect(url.searchParams.get("pgbouncer")).toBe("true");
    expect(url.searchParams.get("connection_limit")).toBe("1");
  });

  it("keeps an existing transaction-pooler URL and existing Prisma options", () => {
    const output = databaseUrlForPrismaRuntime({
      DATABASE_URL:
        "postgresql://prisma.project-ref:secret@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=2",
      PRISMA_CONNECTION_LIMIT: "5",
      VERCEL: "1",
    });

    expect(output).toBeDefined();
    const url = new URL(output as string);
    expect(url.port).toBe("6543");
    expect(url.searchParams.get("pgbouncer")).toBe("true");
    expect(url.searchParams.get("connection_limit")).toBe("2");
  });

  it("does not rewrite direct database hosts", () => {
    const output = databaseUrlForPrismaRuntime({
      DATABASE_URL: "postgresql://postgres:secret@db.example.supabase.co:5432/postgres",
      VERCEL: "1",
    });

    expect(output).toBeDefined();
    const url = new URL(output as string);
    expect(url.hostname).toBe("db.example.supabase.co");
    expect(url.port).toBe("5432");
    expect(url.searchParams.get("pgbouncer")).toBeNull();
    expect(url.searchParams.get("connection_limit")).toBe("1");
  });

  it("leaves the URL unset when there is no runtime connection limit", () => {
    expect(
      databaseUrlForPrismaRuntime({
        DATABASE_URL: "postgresql://postgres:secret@localhost:5432/postgres",
      }),
    ).toBeUndefined();
  });

  it("returns an unparsable URL unchanged when a connection limit is configured", () => {
    expect(
      databaseUrlForPrismaRuntime({
        DATABASE_URL: "not a url",
        PRISMA_CONNECTION_LIMIT: "1",
      }),
    ).toBe("not a url");
  });
});
