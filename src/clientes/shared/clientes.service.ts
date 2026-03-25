import { Injectable } from '@nestjs/common';
import { Cliente } from './cliente';
@Injectable()
export class ClientesService {
    clientes: Cliente[] = [
        {cod_cliente: 1, nome: 'Marlon Afonso', cpf: '007.235.441-00', sexo: 'M', email: 'marlonhafonso@gmail.com' },
        {cod_cliente: 2, nome: 'Allan Turing', cpf: '007.235.441-05', sexo: 'M', email: 'allanturing@gmail.com' },
        {cod_cliente: 3, nome: 'Ada Lovelace', cpf: '007.235.441-06', sexo: 'F', email: 'adalovalace@gmail.com' },
    ];

    /**
     * @returns todos clientes cadastrados
     */
    getAll(){
        return this.clientes;
    }

    /**
     * @param cod_cliente Código do Cliente
     * @returns cliente encontrado pelo Código do Cliente
     */
    getByCod(cod_cliente: number){
        const cliente = this.clientes.find((value) => value.cod_cliente == cod_cliente );
        return cliente;
    }

    /**
     * @param cliente parametro do Cliente para cadastro
     * @returns cliente cadastrado no sistema
     */
    create(cliente: Cliente){
        let cod = 0;
        if(this.clientes.length > 0) {
            cod = this.clientes[this.clientes.length - 1].cod_cliente;
        }

        cliente.cod_cliente = cod + 1;
        this.clientes.push(cliente);
        return cliente;
    }

    /**
     * 
     * @param cliente parametro do Cliente para alterar dados
     * @returns alteracao do cliente
     */
    update(cliente: Cliente){
        const alterarCliente = this.getByCod(cliente.cod_cliente);
        if(alterarCliente){
            alterarCliente.nome = cliente.nome,
            alterarCliente.cpf = cliente.cpf,
            alterarCliente.sexo = cliente.sexo,
            alterarCliente.email = cliente.email
        }

        return alterarCliente;
    }
    
    /**
     * 
     * @param cod_cliente Código do Cliente
     */
    delete(cod_cliente: number){
        const index = this.clientes.findIndex((value) => value.cod_cliente == cod_cliente);
        this.clientes.splice(index, 1);
    }
}
