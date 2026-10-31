import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDefined,
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

export class AlertasClinicasDto {
  @IsOptional()
  @IsArray({ message: 'Las alergias deben ser una lista.' })
  @ArrayMaxSize(20, { message: 'Se pueden registrar hasta 20 alergias.' })
  @IsString({ each: true, message: 'Cada alergia debe ser texto.' })
  @MaxLength(80, { each: true, message: 'Cada alergia puede tener hasta 80 caracteres.' })
  alergias?: string[];

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: 'Las observaciones deben ser texto.' })
  @MaxLength(2000, { message: 'Las observaciones pueden tener hasta 2000 caracteres.' })
  observaciones?: string;
}

export class PerfilGeneticoDto {
  @IsOptional()
  @Transform(trimString)
  @IsString({ message: 'El código de muestra debe ser texto.' })
  @MaxLength(100, { message: 'El código de muestra puede tener hasta 100 caracteres.' })
  codigoMuestra?: string;

  @IsDefined({ message: 'Los marcadores STR son obligatorios.' })
  @IsObject({ message: 'Los marcadores STR deben ser un objeto.' })
  marcadoresSTR!: Record<string, unknown>;
}

export class HuellaDactilarDto {
  @IsOptional()
  @Transform(trimString)
  @IsString({ message: 'La referencia simulada debe ser texto.' })
  @MaxLength(200, { message: 'La referencia simulada puede tener hasta 200 caracteres.' })
  referenciaSimulada?: string;

  @Transform(trimString)
  @IsString({ message: 'El estado de la referencia simulada es obligatorio.' })
  @IsNotEmpty({ message: 'El estado de la referencia simulada es obligatorio.' })
  @MaxLength(50, { message: 'El estado puede tener hasta 50 caracteres.' })
  estado!: string;
}

export class ImportarPersonaDto {
  @Transform(trimString)
  @IsString({ message: 'El nombre completo es obligatorio.' })
  @IsNotEmpty({ message: 'El nombre completo es obligatorio.' })
  @MinLength(3, { message: 'El nombre completo es demasiado corto.' })
  @MaxLength(200, { message: 'El nombre completo puede tener hasta 200 caracteres.' })
  nombreCompleto!: string;

  @Transform(trimString)
  @IsString({ message: 'El identificador es obligatorio.' })
  @IsNotEmpty({ message: 'El identificador es obligatorio.' })
  @MaxLength(100, { message: 'El identificador puede tener hasta 100 caracteres.' })
  @Matches(/^[A-Za-z0-9._-]+$/, {
    message: 'El identificador solo puede contener letras, números, puntos, guiones y guiones bajos.',
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
  @ValidateNested()
  @Type(() => AlertasClinicasDto)
  alertasClinicas?: AlertasClinicasDto;

  @IsDefined({ message: 'El perfil genético es obligatorio.' })
  @ValidateNested()
  @Type(() => PerfilGeneticoDto)
  perfilGenetico!: PerfilGeneticoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => HuellaDactilarDto)
  huellaDactilar?: HuellaDactilarDto;
}
