import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum ModerationAction {
  APPROVE = 'APPROVE',
  REQUEST_CHANGES = 'REQUEST_CHANGES',
  REJECT = 'REJECT',
}

export class ModerationDecisionDto {
  @IsEnum(ModerationAction)
  action!: ModerationAction;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
