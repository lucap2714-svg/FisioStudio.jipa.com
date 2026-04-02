import { google } from 'googleapis';

type DriveClient = ReturnType<typeof google.drive>;

const getDriveClient = () => {
  const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
  const privateKey = (process.env.GOOGLE_DRIVE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

  if (!clientEmail || !privateKey || !rootFolderId) {
    throw new Error('Drive env vars missing (GOOGLE_DRIVE_CLIENT_EMAIL, GOOGLE_DRIVE_PRIVATE_KEY, GOOGLE_DRIVE_ROOT_FOLDER_ID)');
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  const drive = google.drive({ version: 'v3', auth });
  return { drive, rootFolderId };
};

const sanitizeName = (name: string) =>
  (name || 'Aluno')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180) || 'Aluno';

async function findOrCreateStudentFolder(drive: DriveClient, rootFolderId: string, studentName: string): Promise<string> {
  const safeName = sanitizeName(studentName);
  const q = [
    `'${rootFolderId}' in parents`,
    "mimeType = 'application/vnd.google-apps.folder'",
    `name = '${safeName.replace(/'/g, "\\'")}'`,
    'trashed = false',
  ].join(' and ');

  const list = await drive.files.list({ q, fields: 'files(id,name)', spaces: 'drive', pageSize: 1 });
  if (list.data.files && list.data.files.length > 0) return list.data.files[0].id!;

  const created = await drive.files.create({
    requestBody: {
      name: safeName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootFolderId],
    },
    fields: 'id',
  });
  if (!created.data.id) throw new Error('Failed to create student folder');
  return created.data.id;
}

async function uploadPdfToDrive(params: {
  studentName: string;
  docType: string;
  pdfBase64: string;
  timestampISO?: string;
}) {
  const { drive, rootFolderId } = getDriveClient();
  const folderId = await findOrCreateStudentFolder(drive, rootFolderId, params.studentName);

  const now = params.timestampISO ? new Date(params.timestampISO) : new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const filename = `${dateStr} - Ficha de ${params.docType} - ${sanitizeName(params.studentName)}.pdf`;

  const buffer = Buffer.from(params.pdfBase64, 'base64');
  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
    },
    media: { mimeType: 'application/pdf', body: buffer },
    fields: 'id,webViewLink,webContentLink',
  });

  return {
    folderId,
    fileId: res.data.id,
    webViewLink: res.data.webViewLink,
  };
}

export { getDriveClient, findOrCreateStudentFolder, uploadPdfToDrive };
