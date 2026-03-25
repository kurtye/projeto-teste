import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getClientes(): Array<object> {
    return [{ 'codigo': '1', 'nome': 'Marlon Afonso', 'cpf': '007234112', 'sexo': 'M', 'email': 'marlonhafonso@gmail.com' },
    { 'codigo': '2', 'nome': 'Afonso', 'cpf': '00723411233', 'sexo': 'M', 'email': 'marlonhafonso@gmail.com' }
    ];
  }

  inserirCLientes(): Object{
    return  'Cliente inserido com sucesso';
  }

}
