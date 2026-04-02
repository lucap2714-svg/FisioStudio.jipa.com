# Setup do Google Drive (Upload automático de PDFs)

1) Crie um projeto no Google Cloud e habilite a Drive API.
2) Crie uma Service Account e gere uma chave JSON.
3) Compartilhe a pasta raiz do Drive (ID em `DRIVE_ROOT_FOLDER_ID`) com o e-mail da service account (permissão de editor).
4) No Vercel, configure as env vars:
   - `GOOGLE_SERVICE_ACCOUNT_JSON` = conteúdo inteiro do JSON da service account (copie/cole como string).
   - `DRIVE_ROOT_FOLDER_ID` = ID da pasta raiz onde as subpastas das alunas serão criadas.
5) Deploy. O endpoint `/api/drive/upload` usará essas variáveis para criar/usar a pasta da aluna e subir o PDF.

Formato do upload:
POST /api/drive/upload
{
  "studentName": "Nome da Aluna",
  "docType": "Avaliação|Evolução|PDF",
  "pdfBase64": "<base64 do pdf>",
  "timestampISO": "<opcional>"
}
