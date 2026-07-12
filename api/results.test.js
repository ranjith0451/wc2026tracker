import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock ioredis so the handler never opens a real connection.
const redisMock = {
  get: vi.fn(),
  set: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock("ioredis", () => ({
  // regular function so `new Redis(...)` can construct it
  default: vi.fn(function () {
    return redisMock;
  }),
}));

const { default: handler } = await import("./results.js");

function makeRes() {
  const res = {
    statusCode: null,
    body: undefined,
    headers: {},
    setHeader: vi.fn((k, v) => {
      res.headers[k] = v;
    }),
    status: vi.fn((code) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn((payload) => {
      res.body = payload;
      return res;
    }),
    end: vi.fn(() => res),
  };
  return res;
}

const ORIGINAL_REDIS_URL = process.env.REDIS_URL;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.REDIS_URL = "redis://localhost:6379";
});

afterEach(() => {
  if (ORIGINAL_REDIS_URL === undefined) delete process.env.REDIS_URL;
  else process.env.REDIS_URL = ORIGINAL_REDIS_URL;
});

describe("/api/results handler", () => {
  it("answers OPTIONS preflight with CORS headers", async () => {
    const res = makeRes();
    await handler({ method: "OPTIONS" }, res);
    expect(res.statusCode).toBe(200);
    expect(res.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(res.end).toHaveBeenCalled();
  });

  it("returns an empty object when Redis is not configured", async () => {
    delete process.env.REDIS_URL;
    const res = makeRes();
    await handler({ method: "GET" }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({});
    expect(res.headers["Cache-Control"]).toBe("no-store");
  });

  it("GET returns parsed results from Redis", async () => {
    redisMock.get.mockResolvedValue(
      JSON.stringify({ 1: { homeScore: 2, awayScore: 0, status: "finished" } })
    );
    const res = makeRes();
    await handler({ method: "GET" }, res);
    expect(redisMock.get).toHaveBeenCalledWith("wc2026_results");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ 1: { homeScore: 2, awayScore: 0, status: "finished" } });
    expect(redisMock.disconnect).toHaveBeenCalled();
  });

  it("GET returns an empty object when the key is unset", async () => {
    redisMock.get.mockResolvedValue(null);
    const res = makeRes();
    await handler({ method: "GET" }, res);
    expect(res.body).toEqual({});
  });

  it("GET degrades to an empty object when Redis errors", async () => {
    redisMock.get.mockRejectedValue(new Error("boom"));
    const res = makeRes();
    await handler({ method: "GET" }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({});
  });

  it("POST persists a JSON object body", async () => {
    redisMock.set.mockResolvedValue("OK");
    const body = { 1: { homeScore: 1, awayScore: 1, status: "finished" } };
    const res = makeRes();
    await handler({ method: "POST", body }, res);
    expect(redisMock.set).toHaveBeenCalledWith("wc2026_results", JSON.stringify(body));
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("POST rejects non-object bodies with 400", async () => {
    for (const body of [null, "text"]) {
      const res = makeRes();
      await handler({ method: "POST", body }, res);
      expect(res.statusCode).toBe(400);
      expect(redisMock.set).not.toHaveBeenCalled();
    }
  });

  it("POST returns 500 when the write fails", async () => {
    redisMock.set.mockRejectedValue(new Error("write failed"));
    const res = makeRes();
    await handler({ method: "POST", body: {} }, res);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "write failed" });
  });

  it("rejects other methods with 405", async () => {
    const res = makeRes();
    await handler({ method: "PUT" }, res);
    expect(res.statusCode).toBe(405);
  });
});
