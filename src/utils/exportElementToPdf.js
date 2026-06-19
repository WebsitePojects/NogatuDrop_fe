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

  const imageData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const usableWidth = pageWidth - margin * 2;
  const scaledHeight = (canvas.height * usableWidth) / canvas.width;

  let remainingHeight = scaledHeight;
  let positionY = margin;

  pdf.addImage(imageData, 'PNG', margin, positionY, usableWidth, scaledHeight);
  remainingHeight -= pageHeight - margin * 2;

  while (remainingHeight > 0) {
    positionY = remainingHeight - scaledHeight + margin;
    pdf.addPage();
    pdf.addImage(imageData, 'PNG', margin, positionY, usableWidth, scaledHeight);
    remainingHeight -= pageHeight - margin * 2;
  }

  pdf.save(filename);
}
