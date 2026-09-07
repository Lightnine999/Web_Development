import { extractText, getDocumentProxy } from "unpdf";

/** PDF 바이트에서 텍스트만 추출한다. 레이아웃·이미지는 다루지 않는다. */
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return text.trim();
}
