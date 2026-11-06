import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class RecepcionDto {
  @IsString()
  @MinLength(2, { message: 'Indica el laboratorio.' })
  @MaxLength(160)
  laboratorio!: string;

  @IsIn(['INTACTO', 'DANADO', 'AUSENTE'], { message: 'Estado del sello no válido.' })
  estadoSello!: 'INTACTO' | 'DANADO' | 'AUSENTE';

  @IsOptional()
  @IsString()
  @MaxLength(600)
  observaciones?: string;
}

export const ETAPAS_REGISTRABLES = ['EXTRACCION', 'CUANTIFICACION', 'AMPLIFICACION', 'ELECTROFORESIS', 'INTERPRETACION'] as const;

// Todos los campos llegan como texto desde un formulario multipart.
export class EtapaDto {
  @IsIn(ETAPAS_REGISTRABLES as unknown as string[], { message: 'Etapa no válida.' })
  etapa!: (typeof ETAPAS_REGISTRABLES)[number];

  @IsOptional() @IsString() @MaxLength(160) metodo?: string;
  @IsOptional() @IsString() @MaxLength(200) equipos?: string;
  @IsOptional() @Type(() => Number) @IsNumber({}, { message: 'La cantidad de ADN debe ser un número.' }) @Min(0) @Max(100000) adnUgMl?: number;
  @IsOptional() @IsString() @MaxLength(80) kit?: string;
  @IsOptional() @IsString() @MaxLength(60) loteKit?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(50) tubosAlmacenados?: number;
  @IsOptional() @IsString() @MaxLength(120) software?: string;
  @IsOptional() @IsString() @MaxLength(120) analista?: string;
  @IsOptional() @IsString() @MaxLength(600) observaciones?: string;
}

export class AdjuntoDto {
  @IsOptional()
  @IsIn(['RECEPCION_LAB', ...ETAPAS_REGISTRABLES])
  etapa?: string;
}

export class FinalizarDto {
  @IsOptional() @IsString() @MaxLength(400) observaciones?: string;
}

export class PerfilDto {
  @IsOptional() @IsString() @MaxLength(80) kit?: string;
}
