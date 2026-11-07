import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const TIPOS_DOCUMENTO = ['RUN', 'DNI', 'PASAPORTE', 'CEDULA', 'OTRO'];
export const SEXOS = ['Femenino', 'Masculino', 'No binario', 'Prefiere no declarar'];

const TEXTO = /^[\p{L}\p{M} .'-]+$/u;

export class PersonaDto {
  @IsString()
  @MinLength(1, { message: 'Ingresa los nombres.' })
  @MaxLength(80)
  @Matches(TEXTO, { message: 'Los nombres contienen caracteres no válidos.' })
  nombres!: string;

  @IsString()
  @MinLength(1, { message: 'Ingresa los apellidos.' })
  @MaxLength(80)
  @Matches(TEXTO, { message: 'Los apellidos contienen caracteres no válidos.' })
  apellidos!: string;

  @IsIn(TIPOS_DOCUMENTO, { message: 'Tipo de documento no válido.' })
  tipoDocumento!: string;

  @IsString()
  @MinLength(3, { message: 'El número de documento es demasiado corto.' })
  @MaxLength(30)
  @Matches(/^[0-9A-Za-z.\- ]+$/, { message: 'El número de documento contiene caracteres no válidos.' })
  numeroDocumento!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  pais!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  nacionalidad!: string;

  @IsOptional()
  @IsDateString({ strict: true }, { message: 'La fecha de nacimiento no es válida.' })
  fechaNacimiento?: string;

  @IsOptional()
  @IsIn(SEXOS, { message: 'Sexo declarado no válido.' })
  sexoDeclarado?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  institucion?: string;
}

export class BuscarDocumentoDto {
  @IsIn(TIPOS_DOCUMENTO)
  tipoDocumento!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[0-9A-Za-z.\- ]+$/)
  numeroDocumento!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  pais!: string;
}

export class AsociarPersonaDto {
  @IsOptional()
  @IsUUID('4')
  personaId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PersonaDto)
  nueva?: PersonaDto;
}

export class DedoNoObtenibleDto {
  @IsInt()
  @Min(1)
  @Max(10)
  posicion!: number;

  @IsString()
  @MinLength(3, { message: 'Indica el motivo del dedo no obtenible.' })
  @MaxLength(160)
  motivo!: string;
}

export class TomaDto {
  @IsDateString({}, { message: 'La fecha y hora de la toma no es válida.' })
  fechaHora!: string;

  @IsString()
  @MinLength(3, { message: 'Indica el lugar de la toma.' })
  @MaxLength(160)
  lugar!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observaciones?: string;

  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => DedoNoObtenibleDto)
  dedosNoObtenibles!: DedoNoObtenibleDto[];
}

export class ConsentimientoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  versionTexto!: string;

  @IsDateString({}, { message: 'La fecha de firma no es válida.' })
  fechaFirma!: string;

  @IsString()
  @MinLength(2, { message: 'Indica la entidad revisora.' })
  @MaxLength(160)
  entidadRevisora!: string;
}

export class EnvioDto {
  @IsString()
  @MinLength(2, { message: 'Indica el laboratorio de destino.' })
  @MaxLength(160)
  destino!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  transportista?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  sello?: string;
}
