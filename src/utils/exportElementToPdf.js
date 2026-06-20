export async function exportElementToPdf(element, filename) {
  if (!element) {
    throw new Error('Nothing to export');
  }

  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    windowWidth: element.scrollWidth,
  });

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;
  const pagePixelHeight = Math.floor((usableHeight * canvas.width) / usableWidth);

  let offsetY = 0;
  let isFirstPage = true;

  while (offsetY < canvas.height) {
    const sliceHeight = Math.min(pagePixelHeight, canvas.height - offsetY);
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeight;

    const pageContext = pageCanvas.getContext('2d');
    if (!pageContext) {
      throw new Error('Could not prepare PDF page');
    }

    pageContext.fillStyle = '#ffffff';
    pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    pageContext.drawImage(
      canvas,
      0,
      offsetY,
      canvas.width,
      sliceHeight,
      0,
      0,
      pageCanvas.width,
      pageCanvas.height
    );

    const renderedHeight = (sliceHeight * usableWidth) / canvas.width;
    if (!isFirstPage) {
      pdf.addPage();
    }

    pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', margin, margin, usableWidth, renderedHeight);
    offsetY += sliceHeight;
    isFirstPage = false;
  }

  pdf.save(filename);
}
