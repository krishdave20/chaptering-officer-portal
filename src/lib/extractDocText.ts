import mammoth from 'mammoth';

export const SUPPORTED_DOC_EXTENSIONS = ['.docx', '.txt', '.md'];

export async function extractDocText(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.docx')) {
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return value.replace(/\n{3,}/g, '\n\n').trim();
  }

  if (name.endsWith('.txt') || name.endsWith('.md')) {
    return (await file.text()).trim();
  }

  throw new Error(
    `Unsupported file type. Upload a ${SUPPORTED_DOC_EXTENSIONS.join(', ')} file (Google Docs: File → Download → Microsoft Word).`,
  );
}
