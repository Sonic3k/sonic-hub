import { Body, Controller, Get, HttpCode, Inject, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import type { AnswerInput, CreateSessionInput, EnrollmentInput, ReadingProgressInput } from '@learn/shared';
import { sql } from 'drizzle-orm';
import { AnswerBody, CreateSessionBody, EnrollmentBody, ExposureBody, ReadingProgressBody } from './api-schemas.js';
import { CatalogService } from './catalog/catalog.service.js';
import { StatsService } from './catalog/stats.service.js';
import { ZodPipe } from './common/zod-pipe.js';
import { DB, type Db } from './db/db.js';
import { AnswerService } from './study/answer.service.js';
import { StudyService } from './study/study.service.js';

const optionalInt = (v: string | undefined) => (v === undefined || v === '' ? undefined : Number.parseInt(v, 10) || undefined);

@Controller('health')
export class HealthController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Get()
  async health() {
    await this.db.execute(sql`select 1`);
    return { ok: true };
  }
}

@Controller()
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

  @Get('subjects')
  subjects() {
    return this.catalog.subjects();
  }

  @Get('courses/:key')
  course(@Param('key') key: string) {
    return this.catalog.course(key);
  }

  @Post('courses/:key/enrollment')
  @HttpCode(200)
  enroll(@Param('key') key: string, @Body(new ZodPipe(EnrollmentBody)) body: EnrollmentInput) {
    return this.catalog.setEnrollment(key, body);
  }

  @Get('courses/:key/items')
  courseItems(
    @Param('key') key: string,
    @Query('lessonId') lessonId?: string,
    @Query('chapter') chapterKey?: string,
    @Query('tag') tag?: string,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ) {
    return this.catalog.courseItems(key, { lessonId: optionalInt(lessonId), chapterKey, tag, offset: optionalInt(offset), limit: optionalInt(limit) });
  }

  @Get('lessons/:id')
  lesson(@Param('id', ParseIntPipe) id: number) {
    return this.catalog.lesson(id);
  }

  /** How far the learner got in a lesson (reading scroll or slide), for "continue reading". */
  @Put('lessons/:id/progress')
  progress(@Param('id', ParseIntPipe) id: number, @Body(new ZodPipe(ReadingProgressBody)) body: ReadingProgressInput) {
    return this.catalog.setReadingProgress(id, body.position);
  }

  /** The lesson to pick up again (null when there is none). */
  @Get('reading')
  async reading() {
    return { reading: await this.catalog.reading() };
  }

  @Get('items/:key')
  item(@Param('key') key: string, @Query('course') courseKey?: string) {
    return this.catalog.item(key, courseKey);
  }

  @Get('search')
  search(@Query('q') q = '') {
    return this.catalog.search(q);
  }

  /** Learn / skim: the learner has read these items. */
  @Post('exposures')
  @HttpCode(200)
  expose(@Body(new ZodPipe(ExposureBody)) body: { itemKeys: string[] }) {
    return this.catalog.expose(body.itemKeys);
  }
}

@Controller()
export class StudyController {
  constructor(
    @Inject(StudyService) private readonly study: StudyService,
    @Inject(AnswerService) private readonly answers: AnswerService,
    @Inject(StatsService) private readonly statsService: StatsService,
  ) {}

  /** Today's Daily: every enrolled course, or one course with ?course=<key>. */
  @Get('daily')
  daily(@Query('course') courseKey?: string) {
    return this.study.daily(courseKey || undefined);
  }

  @Post('sessions')
  create(@Body(new ZodPipe(CreateSessionBody)) body: CreateSessionInput) {
    return this.study.create(body);
  }

  @Get('sessions/:id')
  session(@Param('id', ParseIntPipe) id: number) {
    return this.study.view(id);
  }

  @Post('sessions/:id/answers')
  @HttpCode(200)
  answer(@Param('id', ParseIntPipe) id: number, @Body(new ZodPipe(AnswerBody)) body: AnswerInput) {
    return this.answers.answer(id, body);
  }

  @Post('sessions/:id/submit')
  @HttpCode(200)
  submit(@Param('id', ParseIntPipe) id: number) {
    return this.answers.submit(id);
  }

  @Get('stats')
  stats(@Query('course') courseKey?: string) {
    return this.statsService.stats(courseKey || undefined);
  }

  /** Leech cards; ?weak=true widens it to everything the learner keeps forgetting (what a weak quiz asks). */
  @Get('leeches')
  leeches(@Query('course') courseKey?: string, @Query('weak') weak?: string) {
    return this.statsService.leeches(courseKey || undefined, { weak: weak === 'true' });
  }
}
