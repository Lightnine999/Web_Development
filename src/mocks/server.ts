/**
 * Node 환경용. Vitest 컴포넌트 테스트와 서버측 fetch에서 쓴다.
 * 브라우저 워커(browser.ts)와 핸들러를 공유한다.
 */
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
