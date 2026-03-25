import { Cliente } from './cliente';
export declare class ClientesService {
    clientes: Cliente[];
    getAll(): Cliente[];
    getByCod(cod_cliente: number): Cliente;
    create(cliente: Cliente): Cliente;
    update(cliente: Cliente): Cliente;
    delete(cod_cliente: number): void;
}
