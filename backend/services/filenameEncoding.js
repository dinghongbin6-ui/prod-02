export function decodeMojibakeFilename(filename) {
  if (typeof filename !== "string" || !/[\u0080-\u009f]/u.test(filename)) return filename;

  const decoded = Buffer.from(filename, "latin1").toString("utf8");
  return decoded.includes("\uFFFD") ? filename : decoded;
}