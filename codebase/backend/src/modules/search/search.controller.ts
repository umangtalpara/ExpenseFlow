import { Controller, Get, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  search(@Query('q') q: string) {
    return this.searchService.globalSearch(q);
  }
}
