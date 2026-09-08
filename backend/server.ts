/**
 * 이 컴퓨터의 Codex CLI를 실제로 호출하는 상시 서버.
 * Next.js는 이제 codex를 직접 spawn하지 않고 이 서버에 HTTP로만 요청한다
 * (src/lib/deck/generate-client.ts). 실행: npm run backend:dev
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { CodexError, generateSlidePlan } from "../src/lib/deck/generate";

const PORT = Number(process.env.PORT ?? 8787);
const SECRET = process.env.BACKEND_SECRET;

if (!SECRET) {
  console.error(
    "[codex-backend] BACKEND_SECRET 이 없습니다. .env.local 에 값을 넣고 " +
      "`npm run backend:dev` 로 실행하세요(이 스크립트가 --env-file 로 읽습니다).\n" +
      "인증 없이 뜨면 이 계정의 Codex 한도를 아무나 쓸 수 있어 기동을 중단합니다.",
  );
  process.exit(1);
}

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf-8")) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/generate") {
    sendJson(res, 404, { error: { code: "NOT_FOUND" } });
    return;
  }

  if (SECRET && req.headers["x-api-key"] !== SECRET) {
    sendJson(res, 401, { error: { code: "UNAUTHORIZED", message: "잘못된 x-api-key" } });
    return;
  }

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: { code: "VALIDATION_FAILED", message: "잘못된 JSON" } });
    return;
  }

  const companyName = String(body.companyName ?? "");
  const sourceText = String(body.sourceText ?? "");

  try {
    const plan = await generateSlidePlan(companyName, sourceText);
    sendJson(res, 200, plan);
  } catch (err) {
    if (err instanceof CodexError) {
      sendJson(res, 502, { error: { code: err.code, message: err.message } });
      return;
    }
    sendJson(res, 502, { error: { code: "CODEX_FAILED", message: String(err) } });
  }
});

// 루프백에만 바인딩한다. 부르는 쪽은 같은 컴퓨터의 Next dev 뿐이므로 LAN 에
// 열 이유가 없다. 열려 있으면 같은 망의 누구나 이 계정의 Codex 한도를 쓸 수 있다.
server.listen(PORT, "127.0.0.1", () => {
  console.log(`[codex-backend] http://127.0.0.1:${PORT} 에서 대기 중 (x-api-key 필요)`);
});
