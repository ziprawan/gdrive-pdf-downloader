import * as Cheerio from "cheerio";
import type { Text } from "domhandler";
import Elysia, { error, redirect, t } from "elysia";
import { checkGDriveFileID } from "../../utils/gdrive_link";

const BASE_URL = "https://drive.google.com/file/d/";

export const download_api = new Elysia({ prefix: "/download" })
  .get("/", () => error(405, "Method Not Allowed"))
  .post(
    "/",
    async (ctx) => {
      const file_id = ctx.body.file_id;
      const password = ctx.body.password;

      if (!checkGDriveFileID(file_id)) {
        return error(400, "Invalid file_id");
      }

      const drive_response = await fetch(BASE_URL + file_id + "/view");

      if (drive_response.status !== 200) {
        return error(400, { ok: false, descriptions: `Expected GDrive response is 200, got ${drive_response.status}` });
      }

      const drive_body = await drive_response.text();
      console.log("Fetch done.");
      const $drive = Cheerio.load(drive_body);
      const scripts = $drive("script");

      const viewer_data_script = $drive(scripts).filter((_, script) => {
        const hasViewerData = script.children.some((child) => {
          return (child as Text).data?.trim()?.startsWith("window.viewerData");
        });

        return hasViewerData;
      });

      if (viewer_data_script.length !== 1) {
        return error(500, {
          ok: false,
          descriptions: `Expected viewer data script length is 1, got ${viewer_data_script.length}`,
        });
      }

      const viewer_data_content = (viewer_data_script[0].children[0] as Text).data.trim();
      let window: {
        viewerData: {
          config: {
            id: string;
            title: string;
            isItemTrashed: boolean;
            documentResourceKey: string;
            enableEmbedDialog: boolean;
            projectorFeedbackId: string;
            projectorFeedbakBucket: string;
          };
          configJson: Array<any>;
          itemJson: Array<any>;
        } | null;
      } = { viewerData: null };
      eval(viewer_data_content);

      if (!window.viewerData) {
        return error(500, { ok: false, descriptions: "viewerData is null." });
      }

      const viewerData = window.viewerData;
      const meta_url_string = viewerData.itemJson[9];
      const file_content_type = viewerData.itemJson[11];

      if (typeof meta_url_string !== "string") {
        return error(500, { ok: false, descriptions: `Expected meta_url type is string, got ${typeof meta_url_string}` });
      }

      if (typeof file_content_type !== "string" || file_content_type !== "application/pdf") {
        return error(400, {
          ok: false,
          descriptions: `Expected file content type is "application/pdf", got: "${file_content_type}"`,
        });
      }

      const meta_url = new URL(meta_url_string);
      // ds key, I don't know why its named ds
      // But its needed for further downloading stuffs
      const ds = meta_url.searchParams.get("ds");

      if (!ds) {
        return error(500, { ok: false, descriptions: "Unable to get ds parameter." });
      }

      const meta_response = await fetch(meta_url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: password ? `pw=${encodeURIComponent(password)}` : undefined,
      });
      const meta_response_json: { bcode: number } | { pages: number; maxPageWidth: number; pdf?: string } = JSON.parse(
        (await meta_response.text()).slice(5)
      );

      if ("bcode" in meta_response_json) {
        ctx.set.headers = { "content-type": "text/html" };
        return `<html><body><h1>GDrive PDF Downloader >:&#40;</h1><p>Masukkan file ID dari google drive yang ingin di unduh...</p><p>Pastikan format filenya adalah PDF</p><h6>Gw males ngecek format yang lain</h6><form method="post" action="/download"><label for="file_id">File ID</label><input name="file_id" value="${file_id}" /> <label for="password">Password</label><input name="password" /><button type="submit">Kirim!</button></form></body></html>`;
      }

      if (meta_response_json.pdf) {
        return redirect(meta_response_json.pdf);
      }

      return { ...window.viewerData.config, meta: meta_response_json };
    },
    { body: t.Object({ file_id: t.String({}), password: t.Optional(t.String()) }) }
  );
