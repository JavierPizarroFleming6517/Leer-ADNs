import { IsDateString, IsInt, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CrearLoteDto {
  @IsUUID('4', { message: 'Elige una plantilla de sticker.' })
  plantillaId!: string;

  @IsInt()
  @Min(1, { message: 'La cantidad mínima es 1.' })
  @Max(500, { message: 'La cantidad máxima por lote es 500.' })
  cantidad!: number;

  @IsDateString({}, { message: 'La fecha de fabricación no es válida.' })
  fechaFabricacion!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  @Matches(/^[\w.\- ]+$/, { message: 'La versión de diseño solo admite letras, números, punto y guion.' })
  versionDiseno!: string;

  @IsString()
  @MinLength(2, { message: 'Indica la fábrica.' })
  @MaxLength(120)
  fabrica!: string;
}

export class ResolverQrDto {
  @IsString()
  @MinLength(4, { message: 'Ingresa un código o el contenido del QR.' })
  @MaxLength(400)
  texto!: string;
}
