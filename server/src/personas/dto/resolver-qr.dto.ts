import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ResolverQrDto {
  @IsString({ message: 'El token del QR es obligatorio.' })
  @IsNotEmpty({ message: 'El token del QR es obligatorio.' })
  @MaxLength(200, { message: 'El token del QR no es válido.' })
  token!: string;
}
