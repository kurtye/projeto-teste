import { Cliente } from './shared/cliente';
import { ClientesService } from './shared/clientes.service';
export declare class ClientesController {
    private clienteService;
    constructor(clienteService: ClientesService);
    getAll(): Promise<Cliente[]>;
    getByCod(cod_cliente: number): Promise<Cliente>;
    create(cliente: Cliente): Promise<Cliente>;
    upadate(cod_cliente: number, cliente: Cliente): Promise<Cliente>;
    delete(cod_cliente: number): Promise<void>;
}
