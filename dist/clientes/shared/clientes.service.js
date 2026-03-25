"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientesService = void 0;
const common_1 = require("@nestjs/common");
let ClientesService = class ClientesService {
    constructor() {
        this.clientes = [
            { cod_cliente: 1, nome: 'Marlon Afonso', cpf: '007.235.441-00', sexo: 'M', email: 'marlonhafonso@gmail.com' },
            { cod_cliente: 2, nome: 'Allan Turing', cpf: '007.235.441-05', sexo: 'M', email: 'allanturing@gmail.com' },
            { cod_cliente: 3, nome: 'Ada Lovelace', cpf: '007.235.441-06', sexo: 'F', email: 'adalovalace@gmail.com' },
        ];
    }
    getAll() {
        return this.clientes;
    }
    getByCod(cod_cliente) {
        const cliente = this.clientes.find((value) => value.cod_cliente == cod_cliente);
        return cliente;
    }
    create(cliente) {
        let cod = 0;
        if (this.clientes.length > 0) {
            cod = this.clientes[this.clientes.length - 1].cod_cliente;
        }
        cliente.cod_cliente = cod + 1;
        this.clientes.push(cliente);
        return cliente;
    }
    update(cliente) {
        const alterarCliente = this.getByCod(cliente.cod_cliente);
        if (alterarCliente) {
            alterarCliente.nome = cliente.nome,
                alterarCliente.cpf = cliente.cpf,
                alterarCliente.sexo = cliente.sexo,
                alterarCliente.email = cliente.email;
        }
        return alterarCliente;
    }
    delete(cod_cliente) {
        const index = this.clientes.findIndex((value) => value.cod_cliente == cod_cliente);
        this.clientes.splice(index, 1);
    }
};
ClientesService = __decorate([
    common_1.Injectable()
], ClientesService);
exports.ClientesService = ClientesService;
//# sourceMappingURL=clientes.service.js.map