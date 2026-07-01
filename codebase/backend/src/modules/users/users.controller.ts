import { Controller, Get, Patch, Delete, Param, Query, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/user.dto';
import { UserStatus } from './schemas/user.schema';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequiredPermissions } from '../../common/decorators/permissions.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('department') department?: string,
    @Query('designation') designation?: string,
    @Query('status') status?: string,
  ) {
    return this.usersService.findAll({
      page,
      limit,
      search,
      department,
      designation,
      status,
    });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RbacGuard)
  @RequiredPermissions('users:manage')
  @HttpCode(HttpStatus.OK)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/status')
  @UseGuards(RbacGuard)
  @RequiredPermissions('users:manage')
  @HttpCode(HttpStatus.OK)
  updateStatus(@Param('id') id: string, @Body('status') status: UserStatus) {
    return this.usersService.updateStatus(id, status);
  }

  @Delete(':id')
  @UseGuards(RbacGuard)
  @RequiredPermissions('users:manage')
  @HttpCode(HttpStatus.OK)
  delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
