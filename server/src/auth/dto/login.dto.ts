import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Ingresa un correo válido.' })
  @MaxLength(200)
  email!: string;

  @IsString()
  @MinLength(1, { message: 'Ingresa la contraseña.' })
  @MaxLength(200)
  password!: string;
}
