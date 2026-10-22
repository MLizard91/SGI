// Genera el reporte de incidencias en PDF (pdfkit) y lo escribe directamente en la respuesta.
// Por protección de datos personales solo incluye nombres: nunca correos ni teléfonos.
const path = require('path');
const PDFDocument = require('pdfkit');

const LOGO = path.join(__dirname, '../../assets/logo-mexticacan.png');
const ZONA = 'America/Mexico_City';
const COLOR = { guinda: '#7a1f2b', texto: '#302a27', muted: '#71675e', borde: '#e4d9c8', fondo: '#f7f3eb' };
const MARGEN = 40;
const PIE = 30; // espacio reservado al pie de página

// 'AAAA-MM-DD' -> '13 de octubre de 2026'
const fechaLarga = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const fechaHora = (fecha) =>
  fecha ? new Date(fecha).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short', timeZone: ZONA }) : '—';

const porcentaje = (parte, total) => (total ? `${Math.round((parte / total) * 100)}%` : '—');

function anchoUtil(doc) {
  return doc.page.width - MARGEN * 2;
}

// Agrega una página si no cabe el alto indicado antes del pie.
function asegurarEspacio(doc, alto) {
  if (doc.y + alto > doc.page.height - MARGEN - PIE) doc.addPage();
}

function tituloSeccion(doc, texto) {
  asegurarEspacio(doc, 70);
  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLOR.guinda).text(texto, MARGEN, doc.y);
  doc.moveTo(MARGEN, doc.y + 2).lineTo(MARGEN + anchoUtil(doc), doc.y + 2).lineWidth(0.8).strokeColor(COLOR.borde).stroke();
  doc.moveDown(0.6);
}

/* Dibuja una tabla con encabezado repetido en cada página.
   columnas: [{ titulo, ancho (fracción del ancho útil), valor: (fila) => texto, alinear? }] */
function tabla(doc, columnas, filas, vacio = 'Sin registros en el periodo') {
  const total = anchoUtil(doc);
  const cols = columnas.map((c) => ({ ...c, ancho: c.ancho * total }));

  const encabezado = () => {
    asegurarEspacio(doc, 40);
    const y = doc.y;
    doc.rect(MARGEN, y, total, 18).fill(COLOR.guinda);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
    let x = MARGEN;
    for (const c of cols) {
      doc.text(c.titulo, x + 4, y + 5, { width: c.ancho - 8, align: c.alinear || 'left', lineBreak: false });
      x += c.ancho;
    }
    doc.y = y + 18;
  };

  encabezado();
  if (!filas.length) {
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(COLOR.muted).text(vacio, MARGEN, doc.y + 6, { width: total, align: 'center' });
    doc.moveDown();
    return;
  }

  filas.forEach((fila, i) => {
    doc.font('Helvetica').fontSize(8);
    const textos = cols.map((c) => {
      const v = c.valor(fila);
      return v === null || v === undefined || v === '' ? '—' : String(v);
    });
    const alto = Math.max(...textos.map((t, j) => doc.heightOfString(t, { width: cols[j].ancho - 8 }))) + 8;

    if (doc.y + alto > doc.page.height - MARGEN - PIE) {
      doc.addPage();
      encabezado();
      doc.font('Helvetica').fontSize(8);
    }
    const y = doc.y;
    if (i % 2) doc.rect(MARGEN, y, total, alto).fill(COLOR.fondo);
    doc.fillColor(COLOR.texto);
    let x = MARGEN;
    textos.forEach((t, j) => {
      doc.text(t, x + 4, y + 4, { width: cols[j].ancho - 8, align: cols[j].alinear || 'left' });
      x += cols[j].ancho;
    });
    doc.y = y + alto;
  });
  doc.moveTo(MARGEN, doc.y).lineTo(MARGEN + total, doc.y).lineWidth(0.5).strokeColor(COLOR.borde).stroke();
  doc.x = MARGEN;
}

function encabezado(doc, { desde, hasta, area, generadoPor }) {
  doc.image(LOGO, MARGEN, MARGEN - 6, { fit: [70, 70] });
  const x = MARGEN + 85;
  const ancho = anchoUtil(doc) - 85;
  doc.font('Helvetica-Bold').fontSize(16).fillColor(COLOR.guinda).text('Reporte de incidencias', x, MARGEN, { width: ancho });
  doc.font('Helvetica').fontSize(9).fillColor(COLOR.muted)
    .text('H. Ayuntamiento de Mexticacán, Jalisco · Sistema de Gestión de Incidencias', { width: ancho });
  doc.moveDown(0.4);
  doc.fontSize(10).fillColor(COLOR.texto);
  doc.font('Helvetica-Bold').text('Periodo: ', { continued: true, width: ancho })
    .font('Helvetica').text(desde === hasta ? fechaLarga(desde) : `del ${fechaLarga(desde)} al ${fechaLarga(hasta)}`);
  doc.font('Helvetica-Bold').text('Área: ', { continued: true, width: ancho }).font('Helvetica').text(area);
  doc.font('Helvetica-Bold').text('Generado por: ', { continued: true, width: ancho })
    .font('Helvetica').text(`${generadoPor} · ${fechaHora(new Date())}`);
  doc.y = Math.max(doc.y, MARGEN + 70) + 8;
  doc.x = MARGEN;
}

function indicadores(doc, t) {
  const datos = [
    ['Total de reportes', t.Total ?? 0],
    ['Pendientes', t.Pendientes ?? 0],
    ['En atención', t.EnAtencion ?? 0],
    ['Resueltas / cerradas', t.Resueltas ?? 0],
    ['Rechazadas', t.Rechazadas ?? 0],
    ['Urgentes abiertas', t.UrgentesAbiertas ?? 0],
    ['% de resolución', porcentaje(t.Resueltas, t.Total)],
    ['Tiempo prom. resolución', t.HorasPromedioResolucion == null ? '—' : `${Number(t.HorasPromedioResolucion).toFixed(1)} h`],
  ];
  const porFila = 4;
  const gap = 8;
  const ancho = (anchoUtil(doc) - gap * (porFila - 1)) / porFila;
  const alto = 44;
  const y0 = doc.y;
  datos.forEach(([etiqueta, valor], i) => {
    const x = MARGEN + (i % porFila) * (ancho + gap);
    const y = y0 + Math.floor(i / porFila) * (alto + gap);
    doc.roundedRect(x, y, ancho, alto, 6).lineWidth(0.8).fillAndStroke(COLOR.fondo, COLOR.borde);
    doc.font('Helvetica').fontSize(8).fillColor(COLOR.muted).text(etiqueta, x + 8, y + 7, { width: ancho - 16 });
    doc.font('Helvetica-Bold').fontSize(15).fillColor(COLOR.guinda).text(String(valor), x + 8, y + 20, { width: ancho - 16 });
  });
  doc.y = y0 + Math.ceil(datos.length / porFila) * (alto + gap);
  doc.x = MARGEN;
}

function piePagina(doc) {
  const { start, count } = doc.bufferedPageRange();
  for (let i = start; i < start + count; i++) {
    doc.switchToPage(i);
    // Sin margen inferior para que escribir en el pie no agregue páginas nuevas.
    const margenInferior = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const y = doc.page.height - MARGEN - 10;
    doc.moveTo(MARGEN, y - 6).lineTo(doc.page.width - MARGEN, y - 6).lineWidth(0.5).strokeColor(COLOR.borde).stroke();
    doc.font('Helvetica').fontSize(7).fillColor(COLOR.muted)
      .text('Documento sin datos de contacto (correo y teléfono) conforme a la protección de datos personales.', MARGEN, y, { width: anchoUtil(doc) - 80, lineBreak: false })
      .text(`Página ${i + 1} de ${count}`, doc.page.width - MARGEN - 80, y, { width: 80, align: 'right', lineBreak: false });
    doc.page.margins.bottom = margenInferior;
  }
}

/* datos: { desde, hasta, area, generadoPor, totales, porArea, porEstatus, porCategoria, incidencias } */
function generarReportePdf(res, datos) {
  const doc = new PDFDocument({
    size: 'LETTER',
    margin: MARGEN,
    bufferPages: true,
    info: { Title: `Reporte de incidencias ${datos.desde} a ${datos.hasta}`, Author: 'SGI Mexticacán' },
  });
  doc.pipe(res);

  encabezado(doc, datos);

  tituloSeccion(doc, 'Resumen general');
  indicadores(doc, datos.totales);

  tituloSeccion(doc, 'Incidencias por área');
  tabla(doc, [
    { titulo: 'Área', ancho: 0.5, valor: (f) => f.Nombre },
    { titulo: 'Reportes', ancho: 0.17, valor: (f) => f.Total, alinear: 'right' },
    { titulo: 'Resueltas', ancho: 0.17, valor: (f) => f.Resueltas ?? 0, alinear: 'right' },
    { titulo: '% resolución', ancho: 0.16, valor: (f) => porcentaje(f.Resueltas, f.Total), alinear: 'right' },
  ], datos.porArea);

  tituloSeccion(doc, 'Incidencias por estatus');
  tabla(doc, [
    { titulo: 'Estatus', ancho: 0.5, valor: (f) => f.Nombre },
    { titulo: 'Reportes', ancho: 0.25, valor: (f) => f.Total, alinear: 'right' },
    { titulo: '% del total', ancho: 0.25, valor: (f) => porcentaje(f.Total, datos.totales.Total), alinear: 'right' },
  ], datos.porEstatus);

  tituloSeccion(doc, 'Incidencias por categoría');
  tabla(doc, [
    { titulo: 'Categoría', ancho: 0.45, valor: (f) => f.Categoria },
    { titulo: 'Área', ancho: 0.35, valor: (f) => f.Area },
    { titulo: 'Reportes', ancho: 0.2, valor: (f) => f.Total, alinear: 'right' },
  ], datos.porCategoria);

  tituloSeccion(doc, `Detalle de incidencias (${datos.incidencias.length})`);
  tabla(doc, [
    { titulo: 'Folio', ancho: 0.11, valor: (f) => f.Folio },
    { titulo: 'Fecha', ancho: 0.11, valor: (f) => fechaHora(f.FechaCreacion) },
    { titulo: 'Área / categoría', ancho: 0.18, valor: (f) => `${f.Area}\n${f.Categoria}` },
    { titulo: 'Título', ancho: 0.22, valor: (f) => f.Titulo },
    { titulo: 'Estatus', ancho: 0.11, valor: (f) => f.Estatus },
    { titulo: 'Prioridad', ancho: 0.09, valor: (f) => f.Prioridad },
    { titulo: 'Asignado a', ancho: 0.18, valor: (f) => f.Asignado || 'Sin asignar' },
  ], datos.incidencias);

  piePagina(doc);
  doc.end();
}

module.exports = { generarReportePdf };
