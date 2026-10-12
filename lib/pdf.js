/**
 * Hebrew/RTL-safe PDF: the report is rendered by the browser (so letters are never reversed)
 * and then captured into an A4 PDF, split into pages. Libraries are loaded on demand.
 */
export async function downloadPdf(html, filename) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const el = document.createElement('div');
  el.dir = 'rtl';
  el.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;padding:36px;background:#fff;color:#111;font-family:Arial,Heebo,sans-serif;font-size:14px;line-height:1.5;box-sizing:border-box';
  el.innerHTML = html;
  document.body.appendChild(el);
  try {
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' });
    const pdf = new jsPDF('p', 'pt', 'a4');
    const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight();
    const pageH = Math.floor((canvas.width * H) / W);
    for (let off = 0, p = 0; off < canvas.height; off += pageH, p++) {
      const sl = document.createElement('canvas');
      sl.width = canvas.width; sl.height = Math.min(pageH, canvas.height - off);
      sl.getContext('2d').drawImage(canvas, 0, off, canvas.width, sl.height, 0, 0, canvas.width, sl.height);
      if (p) pdf.addPage();
      pdf.addImage(sl.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, W, (sl.height * W) / canvas.width);
    }
    pdf.save(filename);
  } finally { document.body.removeChild(el); }
}
