import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
  findAll() {
    return [
      { id: 1, name: 'John' },
      { id: 2, name: 'Jane' },
    ];
  }
}
