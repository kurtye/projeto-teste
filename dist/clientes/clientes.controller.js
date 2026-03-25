"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientesController = void 0;
const common_1 = require("@nestjs/common");
const cliente_1 = require("./shared/cliente");
const clientes_service_1 = require("./shared/clientes.service");
let ClientesController = class ClientesController {
    constructor(clienteService) {
        this.clienteService = clienteService;
    }
    async getAll() {
        return this.clienteService.getAll();
    }
    async getByCod(cod_cliente) {
        return this.clienteService.getByCod(cod_cliente);
    }
    async create(cliente) {
        return this.clienteService.create(cliente);
    }
    async upadate(cod_cliente, cliente) {
        cliente.cod_cliente = cod_cliente;
        return this.clienteService.update(cliente);
    }
    async delete(cod_cliente) {
        this.clienteService.delete(cod_cliente);
    }
};
__decorate([
    common_1.Get(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ClientesController.prototype, "getAll", null);
__decorate([
    common_1.Get(":cod_cliente"),
    __param(0, common_1.Param('cod_cliente')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ClientesController.prototype, "getByCod", null);
__decorate([
    common_1.Post(),
    __param(0, common_1.Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [cliente_1.Cliente]),
    __metadata("design:returntype", Promise)
], ClientesController.prototype, "create", null);
__decorate([
    common_1.Put(':cod_cliente'),
    __param(0, common_1.Param('cod_cliente')),
    __param(1, common_1.Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, cliente_1.Cliente]),
    __metadata("design:returntype", Promise)
], ClientesController.prototype, "upadate", null);
__decorate([
    common_1.Delete(':cod_cliente'),
    __param(0, common_1.Param('cod_cliente')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ClientesController.prototype, "delete", null);
ClientesController = __decorate([
    common_1.Controller('clientes'),
    __metadata("design:paramtypes", [clientes_service_1.ClientesService])
], ClientesController);
exports.ClientesController = ClientesController;
//# sourceMappingURL=clientes.controller.js.map