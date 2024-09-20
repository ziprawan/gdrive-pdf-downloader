import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { index_page } from "./controllers/pages/index.controller";
import { download_api } from "./controllers/apis/download.controller";

const app = new Elysia()
  .use(swagger())
  .use(index_page)
  .use(download_api)
  .post("/hello", () => "Hello too!")
  .listen(3000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
