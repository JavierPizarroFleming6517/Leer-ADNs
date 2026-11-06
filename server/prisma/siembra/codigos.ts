// Códigos FIJOS de los stickers de la demostración: iguales en todas las máquinas y en cada
// "npm run demo:reset", para que los archivos de examples/demo calcen siempre. Los demás stickers
// (los de los lotes y los que se crean en la app) tienen códigos aleatorios, como en producción.
export const CODIGOS_DEMO = {
  // Sticker NUEVO para hacer la toma completa en vivo (paso 3 de la guía).
  enVivo: 'TG-7M4K-2QRT',
  // Personas sembradas, en el orden de PERSONAS.
  personas: ['TG-1VQ3-8ZNE', 'TG-2K7X-9MFB', 'TG-3FTR-6WAP', 'TG-4NJE-8CQS', 'TG-5C8R-7NHQ', 'TG-6BXM-2TZG', 'TG-7DPW-4KJR', 'TG-8RGZ-3VMC'],
  // Enviado al laboratorio y esperando el resultado.
  esperando: 'TG-9AWH-5PXN',
  // Caso de huella duplicada.
  duplicado: 'TG-0ZKT-7HEB',
} as const;

// SPECIMENID del archivo que se rechaza por ser de otra muestra.
export const SPECIMEN_OTRA_MUESTRA = 'TG-9Q4M-2XKD';
