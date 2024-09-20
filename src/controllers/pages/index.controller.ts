import Elysia from "elysia";

export const index_page = new Elysia().get("/", (ctx) => {
  ctx.set.headers = { "content-type": "text/html" };
  return `<html><body><h1>GDrive PDF Downloader >:&#40;</h1><p>Masukkan file ID dari google drive yang ingin di unduh...</p><p>Pastikan format filenya adalah PDF</p><h6>Gw males ngecek format yang lain</h6><form method="post" action="/download"><label for="input1">File ID</label><input name="file_id" /><button type="submit">Kirim!</button></form></body></html>`;
});
