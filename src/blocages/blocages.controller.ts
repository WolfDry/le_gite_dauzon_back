import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BlocagesService } from './blocages.service';
import { CreateBlocageDto } from './dto/create-blocage.dto';
import { UpdateBlocageDto } from './dto/update-blocage.dto';
import { ListBlocagesQueryDto } from './dto/list-blocages-query.dto';

@ApiTags('blocages')
@ApiBearerAuth()
@Controller('blocages')
export class BlocagesController {
  constructor(private readonly blocagesService: BlocagesService) { }

  @Post()
  @ApiOperation({ summary: 'Block dates outside any reservation (personal use, works)' })
  @ApiBody({ type: CreateBlocageDto })
  create(@Body() dto: CreateBlocageDto) {
    return this.blocagesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Blocked periods overlapping a period (bounds included)' })
  findAll(@Query() query: ListBlocagesQueryDto) {
    return this.blocagesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a blocked period by id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.blocagesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a blocked period' })
  @ApiBody({ type: UpdateBlocageDto })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBlocageDto) {
    return this.blocagesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a blocked period' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.blocagesService.remove(id);
  }
}
