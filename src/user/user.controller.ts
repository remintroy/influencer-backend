import { Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('/user')
export class UserController {
  constructor(private readonly usersService: UserService) {}

  @Post()
  createUser() {
    // Implement user creation logic
  }

  @Get(':id')
  getUserById(@Param('id') userId: string) {
    // Implement user retrieval logic by ID
  }

  @Put(':id')
  updateUser(@Param('id') userId: string) {
    // Implement user update logic by ID
  }

  @Delete(':id')
  deleteUser(@Param('id') userId: string) {
    // Implement user deletion logic by ID
  }
}
