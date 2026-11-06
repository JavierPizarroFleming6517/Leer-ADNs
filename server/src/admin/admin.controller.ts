import { Body, ConflictException, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { Rol } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { Ctx, Roles, Sesion, TODOS } from '../common/sesion';
import { PrismaService } from '../prisma/prisma.service';

class UsuarioDto {
  @IsString() @MinLength(2) @MaxLength(120) nombre!: string;
  @IsEmail({}, { message: 'Correo no válido.' }) @MaxLength(200) email!: string;
  @IsIn(['ADMIN'], { message: 'Solo se puede crear el rol de administrador.' }) rol!: Rol;
  @IsOptional() @IsString() @MaxLength(120) institucion?: string;
  @IsString() @MinLength(10, { message: 'La contraseña debe tener al menos 10 caracteres.' }) @MaxLength(200) password!: string;
}

class EstadoUsuarioDto {
  @IsBoolean() activo!: boolean;
}

class PlantillaDto {
  @IsString() @MinLength(3) @MaxLength(80) nombre!: string;
  @IsString() @MinLength(2) @MaxLength(60) pais!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @ArrayUnique() @IsInt({ each: true }) @Min(1, { each: true }) @Max(10, { each: true }) posiciones!: number[];
}

class KitDto {
  @IsString() @MinLength(2) @MaxLength(80) nombre!: string;
  @IsString() @MinLength(2) @MaxLength(80) fabricante!: string;
  @IsArray() @ArrayMinSize(5) @ArrayMaxSize(40) @ArrayUnique() @IsString({ each: true }) @MaxLength(20, { each: true }) loci!: string[];
}

@Controller()
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  @Roles(...TODOS)
  @Get('catalogos')
  async catalogos() {
    const [plantillas, kits] = await Promise.all([
      this.prisma.plantillaSticker.findMany({ orderBy: { createdAt: 'asc' } }),
      this.prisma.kit.findMany({ orderBy: { nombre: 'asc' } }),
    ]);
    return { plantillas, kits };
  }

  @Roles('ADMIN')
  @Get('admin/usuarios')
  usuarios() {
    return this.prisma.usuario.findMany({
      where: { rol: 'ADMIN' },
      orderBy: { createdAt: 'asc' },
      select: { id: true, nombre: true, email: true, rol: true, institucion: true, activo: true, createdAt: true },
    });
  }

  @Roles('ADMIN')
  @Post('admin/usuarios')
  async crearUsuario(@Sesion() ctx: Ctx, @Body() dto: UsuarioDto) {
    const email = dto.email.toLowerCase().trim();
    if (await this.prisma.usuario.findUnique({ where: { email } })) throw new ConflictException('Ya existe un usuario con ese correo.');
    const u = await this.prisma.usuario.create({
      data: { nombre: dto.nombre, email, rol: dto.rol, institucion: dto.institucion ?? null, passwordHash: await bcrypt.hash(dto.password, 12) },
      select: { id: true, nombre: true, email: true, rol: true, institucion: true, activo: true, createdAt: true },
    });
    await this.auditoria.registrar(ctx, 'CREAR_USUARIO', { recurso: u.email, detalle: { rol: u.rol } });
    return u;
  }

  @Roles('ADMIN')
  @Patch('admin/usuarios/:id')
  async estadoUsuario(@Sesion() ctx: Ctx, @Param('id', new ParseUUIDPipe()) id: string, @Body() dto: EstadoUsuarioDto) {
    if (id === ctx.usuario.id && !dto.activo) throw new ConflictException('No puedes desactivar tu propio usuario.');
    const u = await this.prisma.usuario.update({ where: { id }, data: { activo: dto.activo }, select: { id: true, email: true, activo: true } });
    await this.auditoria.registrar(ctx, dto.activo ? 'ACTIVAR_USUARIO' : 'DESACTIVAR_USUARIO', { recurso: u.email });
    return u;
  }

  @Roles('ADMIN')
  @Post('admin/plantillas')
  async plantilla(@Sesion() ctx: Ctx, @Body() dto: PlantillaDto) {
    const p = await this.prisma.plantillaSticker.create({ data: { nombre: dto.nombre, pais: dto.pais, posiciones: [...dto.posiciones].sort((a, b) => a - b) } });
    await this.auditoria.registrar(ctx, 'CREAR_PLANTILLA', { recurso: p.nombre });
    return p;
  }

  @Roles('ADMIN')
  @Post('admin/kits')
  async kit(@Sesion() ctx: Ctx, @Body() dto: KitDto) {
    const k = await this.prisma.kit.create({ data: dto });
    await this.auditoria.registrar(ctx, 'CREAR_KIT', { recurso: k.nombre });
    return k;
  }
}
