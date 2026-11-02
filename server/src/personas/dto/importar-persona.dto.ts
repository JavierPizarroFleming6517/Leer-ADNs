import { Transform, Type } from 'class-transformer';
import {
  IsDefined,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

function trimString({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim() : value;
}

export class PerfilGeneticoDto {
  @Transform(trimString)
  @IsString({ message: 'El código de muestra es obligatorio.' })
  @IsNotEmpty({ message: 'El código de muestra es obligatorio.' })
  @MaxLength(100, { message: 'El código de muestra puede tener hasta 100 caracteres.' })
  codigoMuestra!: string;

  @IsDefined({ message: 'Los marcadores STR son obligatorios.' })
  @IsObject({ message: 'Los marcadores STR deben ser un objeto.' })
  marcadoresSTR!: Record<string, unknown>;

  @IsOptional()
  @IsIn(['CMF_XML', 'PLANILLA_XLSX', 'PLANILLA_CSV'], { message: 'Formato de origen no válido.' })
  formatoOrigen?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(200, { message: 'El nombre del archivo puede tener hasta 200 caracteres.' })
  archivoOrigen?: string;

  @IsOptional()
  @Matches(/^[a-f0-9]{64}$/, { message: 'La huella del archivo no es válida.' })
  hashArchivo?: string;
}

export class ImportarPersonaDto {
  @Transform(trimString)
  @IsString({ message: 'El nombre completo es obligatorio.' })
  @IsNotEmpty({ message: 'El nombre completo es obligatorio.' })
  @MinLength(3, { message: 'El nombre completo es demasiado corto.' })
  @MaxLength(200, { message: 'El nombre completo puede tener hasta 200 caracteres.' })
  nombreCompleto!: string;

  @Transform(trimString)
  @IsString({ message: 'El documento de identidad es obligatorio.' })
  @IsNotEmpty({ message: 'El documento de identidad es obligatorio.' })
  @MaxLength(100, { message: 'El documento puede tener hasta 100 caracteres.' })
  @Matches(/^[A-Za-z0-9._-]+$/, {
    message: 'El documento solo puede contener letras, números, puntos y guiones.',
  })
  identificador!: string;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: 'La fecha de nacimiento debe ser texto en formato AAAA-MM-DD.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha de nacimiento debe tener el formato AAAA-MM-DD.',
  })
  fechaNacimiento?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(60, { message: 'La nacionalidad puede tener hasta 60 caracteres.' })
  nacionalidad?: string;

  @IsDefined({ message: 'El perfil genético es obligatorio.' })
  @ValidateNested()
  @Type(() => PerfilGeneticoDto)
  perfilGenetico!: PerfilGeneticoDto;
}
