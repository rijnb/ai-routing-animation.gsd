/**
 * handleFile — reads a File as an ArrayBuffer and transfers it to the given Worker.
 * Returns a Promise that resolves when the buffer has been sent.
 */
export async function handleFile(file: File, worker: Worker): Promise<void> {
  const buffer = await file.arrayBuffer()
  worker.postMessage(buffer, [buffer])
}
