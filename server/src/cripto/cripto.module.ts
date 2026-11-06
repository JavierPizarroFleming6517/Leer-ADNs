import { Global, Module } from '@nestjs/common';
import { CriptoService } from './cripto.service';

@Global()
@Module({ providers: [CriptoService], exports: [CriptoService] })
export class CriptoModule {}
