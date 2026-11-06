import { Injectable } from '@nestjs/common';
import { config } from '../common/config';
import {
  Cifrador,
  Firmador,
  TEXTO_FIRMA_QR,
  base64url,
  desdeBase64url,
  indiceCiego,
} from './cripto';

@Injectable()
export class CriptoService {
  readonly cifrador = new Cifrador(config().claveDatos);
  readonly firmador = new Firmador(config().ed25519Privada, config().ed25519Publica);

  cifrar(t: string) {
    return this.cifrador.cifrar(t);
  }

  descifrar(t: string) {
    return this.cifrador.descifrar(t);
  }

  indiceDocumento(tipo: string, numero: string, pais: string) {
    return indiceCiego(config().claveIndice, tipo, numero, pais);
  }

  firmaQr(codigo: string): string {
    return base64url(this.firmador.firmar(TEXTO_FIRMA_QR(codigo)));
  }

  verificarFirmaQr(codigo: string, firma: string): boolean {
    const b = desdeBase64url(firma);
    if (!b || b.length !== 64) return false;
    return this.firmador.verificar(TEXTO_FIRMA_QR(codigo), b);
  }

  urlQr(codigo: string): string {
    return `${config().appUrl}/s/${codigo}.${this.firmaQr(codigo)}`;
  }
}
