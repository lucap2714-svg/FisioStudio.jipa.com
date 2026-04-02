import { google } from 'googleapis';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { studentName, docType, pdfBase64, timestampISO } = req.body || {};
  if (!studentName || !pdfBase64) {
    res.status(400).json({ error: 'Missing studentName or pdfBase64' });
    return;
  }

  try {
    const credsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const rootFolder = process.env.DRIVE_ROOT_FOLDER_ID;
    if (!credsJson || !rootFolder) {
      res.status(500).json({ error: 'Drive credentials not configured' });
      return;
    }

    const credentials = JSON.parse(credsJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
    const drive = google.drive({ version: 'v3', auth });

    const safeName = String(studentName || '').trim().replace(/\s+/g, ' ').slice(0, 200) || 'Aluno';
    const now = timestampISO ? new Date(timestampISO) : new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    const doc = docType || 'PDF';
    const fileName = `${safeName} - ${doc} - ${ts}.pdf`;

    // 1) Garantir pasta do aluno
    let folderId: string | null = null;
    const list = await drive.files.list({
      q: `'${rootFolder}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '${safeName.replace(/'/g, "\\'")}' and trashed = false`,
      fields: 'files(id,name)',
      spaces: 'drive',
      pageSize: 1,
    });
    if (list.data.files && list.data.files.length > 0) {
      folderId = list.data.files[0].id!;
    } else {
      const created = await drive.files.create({
        requestBody: {
          name: safeName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [rootFolder],
        },
        fields: 'id',
      });
      folderId = created.data.id || null;
    }

    if (!folderId) {
      res.status(500).json({ error: 'Folder creation failed' });
      return;
    }

    // 2) Upload
    const buffer = Buffer.from(pdfBase64, 'base64');
    await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType: 'application/pdf',
        body: Buffer.from(buffer),
      },
      fields: 'id',
    });

    res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error('[Drive][Upload] erro', e);
    res.status(500).json({ error: e?.message || 'upload_failed' });
  }
}
