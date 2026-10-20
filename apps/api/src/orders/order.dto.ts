import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import type { CreateOrder, OrderStatus } from "@stolovaya/contracts";

export class OrderQuery {
  @ApiPropertyOptional({ enum: ["day", "week"], default: "day" })
  @IsOptional()
  @IsIn(["day", "week"])
  period?: "day" | "week";
  @ApiPropertyOptional({ example: "2026-10-19" })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  date?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) dish?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  group?: string;
  @ApiPropertyOptional({ enum: ["all", "new", "cooking", "ready", "pending"] })
  @IsOptional()
  @IsIn(["all", "new", "cooking", "ready", "pending"])
  status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) q?: string;
  @ApiPropertyOptional({ example: "09" })
  @IsOptional()
  @Matches(/^(?:0\d|1\d|2[0-3])$/)
  hour?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  on?: string;
  @ApiPropertyOptional({ enum: ["qty", "qty-asc"] })
  @IsOptional()
  @IsIn(["qty", "qty-asc"])
  sort?: string;
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page?: number;
}

const normalizeName = ({ value }: { value: unknown }): unknown =>
  typeof value === "string"
    ? value.normalize("NFKC").trim().replace(/\s+/gu, " ")
    : value;

export class CreateOrderDto implements CreateOrder {
  @ApiProperty({ example: "Куриный суп с лапшой", maxLength: 120 })
  @Transform(normalizeName)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  dishName!: string;
  @ApiProperty({ example: "5А", maxLength: 60 })
  @Transform(normalizeName)
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  groupName!: string;
  @ApiProperty({ minimum: 1, maximum: 10000 })
  @IsInt()
  @Min(1)
  @Max(10000)
  quantity!: number;
  @ApiProperty({ example: "2026-10-19" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  serviceDate!: string;
  @ApiProperty({ example: "12:10" })
  @Matches(/^(?:0\d|1\d|2[0-3]):[0-5]\d$/)
  servingTime!: string;
}

export class ChangeStatusDto {
  @ApiProperty({ enum: ["cooking", "ready"] })
  @IsIn(["cooking", "ready"])
  status!: OrderStatus;
}
