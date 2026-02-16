
/**
 * Utilitário de Exportação PDF Consolidado - FisioStudio
 * Resolve problemas de cortes (cropping) e páginas pretas (canvas errors).
 */

export async function exportSheetToPdf(element: HTMLElement, filename: string) {
  console.log(`[PDF_EXPORT] Iniciando exportação: ${filename}`);
  
  // 1. Aguardar fontes e imagens carregarem completamente
  await document.fonts.ready;
  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(images.map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise(resolve => {
      img.onload = resolve;
      img.onerror = resolve;
    });
  }));

  // 2. Criar container de isolamento offscreen
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-9999px';
  wrapper.style.top = '0';
  wrapper.style.width = '210mm'; // Largura fixa A4
  wrapper.style.backgroundColor = '#FFFFFF';
  wrapper.style.zIndex = '-1000';
  document.body.appendChild(wrapper);

  // 3. Clonar e limpar o elemento
  const clone = element.cloneNode(true) as HTMLElement;
  
  // Remover elementos que não devem ir para o PDF
  clone.querySelectorAll('.no-print').forEach(el => el.remove());

  // Resetar estilos problemáticos no clone para garantir fundo branco e sem filtros
  clone.style.width = '210mm';
  clone.style.margin = '0';
  clone.style.padding = '15mm'; 
  clone.style.transform = 'none';
  clone.style.filter = 'none';
  clone.style.position = 'relative';
  clone.style.display = 'block';
  clone.style.visibility = 'visible';
  clone.style.backgroundColor = '#FFFFFF';
  clone.style.boxSizing = 'border-box';
  clone.style.overflow = 'visible';
  clone.style.height = 'auto';
  clone.style.maxHeight = 'none';

  wrapper.appendChild(clone);

  // Diagnóstico pré-captura
  console.log(`[PDF_EXPORT] Dimensões do wrapper: ${wrapper.scrollWidth}x${wrapper.scrollHeight}`);

  try {
    // Acessando as bibliotecas globais com fallback para diferentes CDNs/Versões
    const html2canvas = (window as any).html2canvas;
    
    // O jsPDF pode estar em window.jspdf.jsPDF (UMD) ou window.jsPDF (Legacy)
    let jsPDF;
    if ((window as any).jspdf && (window as any).jspdf.jsPDF) {
      jsPDF = (window as any).jspdf.jsPDF;
    } else {
      jsPDF = (window as any).jsPDF;
    }

    if (!html2canvas) {
        throw new Error("Biblioteca html2canvas não encontrada globalmente.");
    }
    if (!jsPDF) {
        throw new Error("Biblioteca jsPDF não encontrada globalmente.");
    }

    // 4. Capturar canvas de alta resolução
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#FFFFFF',
      width: clone.offsetWidth,
      height: clone.offsetHeight,
      logging: false,
      onclone: (clonedDoc: any) => {
          // Garante que o clone dentro do html2canvas também seja visível
          const el = clonedDoc.querySelector('div');
          if (el) el.style.visibility = 'visible';
      }
    });

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error("Canvas vazio capturado. Verifique se o elemento é visível.");
    }

    // 5. Configurar PDF (A4 = 210mm x 297mm)
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const pdfWidth = 210;
    const pdfHeight = 297;
    const margin = 0; 
    const contentWidth = pdfWidth - (margin * 2);
    const contentHeight = (canvas.height * contentWidth) / canvas.width;
    
    let heightLeft = contentHeight;
    let position = 0;

    // 6. Tiling (Fatiamento Manual) para suporte a múltiplas páginas sem cortes
    // Primeira página
    pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
    heightLeft -= pdfHeight;

    // Páginas subsequentes
    while (heightLeft > 0) {
      position = heightLeft - contentHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
      heightLeft -= pdfHeight;
    }

    console.log(`[PDF_EXPORT] PDF gerado com ${pdf.internal.getNumberOfPages()} páginas.`);
    pdf.save(filename);

  } catch (error: any) {
    console.error("[PDF_EXPORT] Falha crítica:", error);
    alert(`Erro ao gerar o PDF: ${error.message || "Erro desconhecido"}`);
  } finally {
    if (document.body.contains(wrapper)) {
      document.body.removeChild(wrapper);
    }
  }
}
