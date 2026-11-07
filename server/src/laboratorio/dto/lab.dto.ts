import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// Llega desde un formulario multipart: todo es texto.
export class PerfilDto {
  @IsString()
  @MinLength(2, { message: 'Indica el kit de amplificación que usó el laboratorio.' })
  @MaxLength(80)
  kit!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  laboratorio?: string;

  // "false" si el laboratorio informa que no queda material en el adhesivo.
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  materialRestante?: boolean;
}

export class MaterialAgotadoDto {
  @IsOptional() @IsString() @MaxLength(400) observaciones?: string;
}
