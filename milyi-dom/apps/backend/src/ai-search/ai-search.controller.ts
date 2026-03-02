import { Body, Controller, Post } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { AiSearchService } from './ai-search.service';

class InterpretDto {
  @IsString()
  @MinLength(2)
  query!: string;
}

class TranslateDto {
  @IsString()
  @MinLength(1)
  text!: string;

  @IsString()
  @MinLength(2)
  targetLanguage!: string;
}

@Controller('ai-search')
export class AiSearchController {
  constructor(private readonly aiSearchService: AiSearchService) {}

  @Post('interpret')
  interpret(@Body() dto: InterpretDto) {
    return this.aiSearchService.interpret(dto.query);
  }

  @Post('translate')
  translate(@Body() dto: TranslateDto) {
    return this.aiSearchService.translate(dto.text, dto.targetLanguage);
  }
}
