import { Injectable, BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';

export interface CsvProductRow {
  sku: string;
  title: string;
  description?: string;
  category: string;
  wholesalePrice: number;
  stock: number;
  slaDays: number;
}

export interface CsvParseResult {
  valid: CsvProductRow[];
  errors: { row: number; reason: string }[];
}

@Injectable()
export class CsvParserService {
  parseProductsCsv(buffer: Buffer): CsvParseResult {
    const valid: CsvProductRow[] = [];
    const errors: { row: number; reason: string }[] = [];

    let records: any[];
    try {
      records = parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (err: any) {
      throw new BadRequestException(`Failed to parse CSV file: ${err.message}`);
    }

    records.forEach((record, index) => {
      const rowNumber = index + 2; // +1 for 0-index, +1 for header row

      // Standardize headers (support both snake_case and camelCase)
      const sku = record.sku || record.SKU;
      const title = record.title || record.Title;
      const description = record.description || record.Description || '';
      const category = record.category || record.Category;

      const wholesalePriceStr =
        record.wholesale_price ||
        record.wholesalePrice ||
        record.WholesalePrice;
      const stockStr = record.stock || record.Stock;
      const slaDaysStr = record.sla_days || record.slaDays || record.SlaDays;

      if (!sku) {
        errors.push({ row: rowNumber, reason: 'Missing SKU' });
        return;
      }
      if (!title) {
        errors.push({ row: rowNumber, reason: 'Missing Title' });
        return;
      }
      if (!category) {
        errors.push({ row: rowNumber, reason: 'Missing Category' });
        return;
      }

      const wholesalePrice = parseFloat(wholesalePriceStr);
      if (isNaN(wholesalePrice) || wholesalePrice < 0) {
        errors.push({
          row: rowNumber,
          reason: `Invalid wholesale price: ${wholesalePriceStr}`,
        });
        return;
      }

      const stock = parseInt(stockStr, 10);
      if (isNaN(stock) || stock < 0) {
        errors.push({ row: rowNumber, reason: `Invalid stock: ${stockStr}` });
        return;
      }

      const slaDays = parseInt(slaDaysStr, 10);
      if (isNaN(slaDays) || slaDays < 1) {
        errors.push({
          row: rowNumber,
          reason: `Invalid SLA days: ${slaDaysStr}`,
        });
        return;
      }

      valid.push({
        sku,
        title,
        description,
        category,
        wholesalePrice,
        stock,
        slaDays,
      });
    });

    return { valid, errors };
  }
}
