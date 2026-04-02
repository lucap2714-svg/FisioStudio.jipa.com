import type { NextApiRequest, NextApiResponse } from 'next';
import { uploadPdfToDrive } from '../../services/driveService';

const MAX_SIZE_BASE64 = 12 * 1024 * 1024; // ~12MB base64 string (~9MB binary)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { studentId, studentName, docType, pdfBase64, timestampISO } = req.body || {};
  if (!studentName || !docType || !pdfBase64) {
    res.status(400).json({ error: 'Missing fields' });
    return;
  }

  if (pdfBase64.length > MAX_SIZE_BASE64) {
    res.status(413).json({ error: 'PDF too large' });
    return;
  }

  const started = Date.now();
  try {
    const result = await uploadPdfToDrive({
      studentName,
      docType,
      pdfBase64,
      timestampISO,
    });
    const elapsed = Date.now() - started;
    console.info('[Drive][UploadPDF] ok', { studentId, studentName, docType, fileId: result.fileId, folderId: result.folderId, elapsedMs: elapsed });
    res.status(200).json(result);
  } catch (e: any) {
    const elapsed = Date.now() - started;
    console.error('[Drive][UploadPDF] fail', { studentId, studentName, docType, elapsedMs: elapsed, error: e?.message });
    res.status(500).json({ error: e?.message || 'upload_failed' });
  }
}
