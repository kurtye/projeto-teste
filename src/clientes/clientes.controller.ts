import { Body, Controller, Delete, Get, Param , Post, Put} from '@nestjs/common';
import { Cliente } from './shared/cliente';
import { ClientesService } from './shared/clientes.service';

@Controller('clientes')
export class ClientesController {

    constructor(private clienteService: ClientesService){

    }

    @Get()
    async getAll() : Promise<Cliente[]>{
        return this.clienteService.getAll();
    }

    @Get(":cod_cliente")
    async getByCod(@Param('cod_cliente') cod_cliente: number) : Promise<Cliente>{
        return this.clienteService.getByCod(cod_cliente);
    }

    @Post()
    async create(@Body()cliente: Cliente): Promise<Cliente>{
        return this.clienteService.create(cliente);
    }

    @Put(':cod_cliente')
    async upadate(@Param('cod_cliente') cod_cliente: number, @Body() cliente: Cliente): Promise<Cliente>{
        cliente.cod_cliente = cod_cliente;
        return this.clienteService.update(cliente)
    }

    @Delete(':cod_cliente')
    async delete(@Param('cod_cliente') cod_cliente: number){
        this.clienteService.delete(cod_cliente);
    }
} 
 