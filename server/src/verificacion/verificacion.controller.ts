import { BadRequestException, Body, Controller, HttpCode, Injectable, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';
import { AfisService } from '../afis/afis.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { exigirArchivo, nombreArchivo, subida, tipoImagen } from '../common/archivos';
import { Ctx, Roles, Sesion } from '../common/sesion';
import { sha256 } from '../cripto/cripto';
import { CustodiaService } from '../custodia/custodia.service';
import { ErrorPerfil, resumir } from '../genetica/str';
import { NOMBRE_FORMATO, leerArchivo } from '../genetica/lectores';
import { HuellasService } from '../huellas/huellas.service';
import { LaboratorioService } from '../laboratorio/laboratorio.service';

class VerificarHuellaDto {
  @Type(() => Number)
  @IsNumber()
  @Min(250)
  @Max(1200)
  dpi!: number;
}

@Injectable()
export class VerificacionService {
  constructor(
    private readonly afis: AfisService,
    private readonly huellas: HuellasService,
    private readonly lab: LaboratorioService,
    private readonly custodia: CustodiaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async porHuella(nombre: string, datos: Buffer, dpi: number, ctx: Ctx) {
    if (!tipoImagen(datos)) throw new BadRequestException('La imagen debe ser PNG, JPEG o TIFF.');
    const ex = await this.afis.extraer(datos, dpi);
    const r = await this.huellas.buscar(Buffer.from(ex.template, 'base64'));
    const coincidencias = r.mejores.filter((m) => m.coincide);
    const hash = sha256(datos);
    for (const c of coincidencias.slice(0, 3)) {
      await this.custodia.agregarSolo({
        stickerId: c.stickerId,
        tipo: 'VERIFICACION',
        ctx,
        archivoSha256: hash,
        detalle: { tipo: 'HUELLA_1_N', dedo: c.dedo, puntaje: c.puntaje, umbral: r.umbral, comparadas: r.candidatas },
      });
    }
    await this.auditoria.registrar(ctx, 'VERIFICACION_HUELLA', {
      recurso: coincidencias[0]?.stickerCodigo ?? 'sin-coincidencia',
      detalle: { sha256: hash, puntajeMaximo: r.mejores[0]?.puntaje ?? 0, coincidencias: coincidencias.length, comparadas: r.candidatas },
    });
    return {
      archivo: { nombre, sha256: hash, dpi },
      sonda: { minucias: ex.minutiae, cantidadMinucias: ex.minutiaCount, ancho: ex.width, alto: ex.height, png: ex.png },
      umbral: r.umbral,
      comparadas: r.candidatas,
      millis: r.millis,
      coincide: coincidencias.length > 0,
      mejores: r.mejores.map(({ stickerId: _s, ...m }) => m),
    };
  }

  async porPerfil(nombre: string, datos: Buffer, ctx: Ctx) {
    let leido;
    try {
      leido = await leerArchivo(nombre, datos);
    } catch (e) {
      if (e instanceof ErrorPerfil) throw new BadRequestException(e.message);
      throw e;
    }
    const hash = sha256(datos);
    const registrados = await this.lab.perfilesRegistrados();
    const muestras = [];
    for (const m of leido.muestras.slice(0, 50)) {
      const coincidencias = await this.lab.coincidencias(m.marcadores);
      for (const c of coincidencias) {
        const st = registrados.find((r) => r.stickerCodigo === c.stickerCodigo);
        if (st) {
          await this.custodia.agregarSolo({
            stickerId: st.stickerId,
            tipo: 'VERIFICACION',
            ctx,
            archivoSha256: hash,
            detalle: { tipo: 'PERFIL_STR', muestraConsultada: m.codigoMuestra, lociComparados: c.lociComparados },
          });
        }
      }
      muestras.push({ codigoMuestra: m.codigoMuestra, resumen: resumir(m.marcadores), coincidencias });
    }
    await this.auditoria.registrar(ctx, 'VERIFICACION_PERFIL', {
      recurso: muestras.find((m) => m.coincidencias.length)?.coincidencias[0].stickerCodigo ?? 'sin-coincidencia',
      detalle: { sha256: hash, muestras: muestras.length, coincidencias: muestras.reduce((n, m) => n + m.coincidencias.length, 0) },
    });
    return { archivo: { nombre, sha256: hash, formato: NOMBRE_FORMATO[leido.formato] }, comparados: registrados.length, muestras };
  }
}

@Controller('verificacion')
export class VerificacionController {
  constructor(private readonly v: VerificacionService) {}

  @Roles('ADMIN', 'VERIFICADOR', 'OPERADOR_TOMA', 'LABORATORIO')
  @Post('huella')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('imagen', subida(15)))
  huella(@Sesion() ctx: Ctx, @Body() dto: VerificarHuellaDto, @UploadedFile() f?: Express.Multer.File) {
    const a = exigirArchivo(f, 'imagen');
    return this.v.porHuella(nombreArchivo(a), a.buffer, dto.dpi, ctx);
  }

  @Roles('ADMIN', 'VERIFICADOR', 'LABORATORIO')
  @Post('perfil')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('archivo', subida(5)))
  perfil(@Sesion() ctx: Ctx, @UploadedFile() f?: Express.Multer.File) {
    const a = exigirArchivo(f);
    return this.v.porPerfil(nombreArchivo(a), a.buffer, ctx);
  }
}
