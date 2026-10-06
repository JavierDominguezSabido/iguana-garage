import { expect, it } from "vitest";
import { readBoundedBody } from "./upload-body";
it("limita también una subida por chunks sin Content-Length", async () => {
  const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(4)); controller.enqueue(new Uint8Array(4)); controller.close(); } });
  const request = new Request("http://localhost/upload", { method: "POST", body, duplex: "half" } as RequestInit);
  await expect(readBoundedBody(request, 6)).rejects.toThrow("La foto supera el límite de subida");
});
it("conserva los bytes de una subida dentro del límite", async () => {
  const request = new Request("http://localhost/upload", { method: "POST", body: new Uint8Array([1, 2, 3]) });
  expect(await readBoundedBody(request, 3)).toEqual(new Uint8Array([1, 2, 3]));
});
