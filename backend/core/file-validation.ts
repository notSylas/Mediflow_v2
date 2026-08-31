import { fileTypeFromBuffer } from "file-type";

/**
 * Verifies a file's actual content (magic bytes) matches one of the allowed
 * MIME types — the client-supplied `file.type` is just a header the browser
 * sets from the filename/extension, trivially spoofable, so every upload
 * site must also check what the bytes really are before storing them.
 *
 * Returns false for anything unrecognized or mismatched, including formats
 * `file-type` can't sniff at all (e.g. plain text) — every upload site here
 * only allows binary formats (pdf/image) that always have a real signature.
 */
export async function verifyFileContentType(
  buffer: Buffer,
  allowedMimeTypes: readonly string[]
): Promise<boolean> {
  const detected = await fileTypeFromBuffer(buffer);
  return detected !== undefined && allowedMimeTypes.includes(detected.mime);
}
