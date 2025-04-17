/**
 * PDF Service for JurisAI
 * Provides utilities for creating and downloading PDFs from application content
 * NOTE: PDF functionality is disabled in the MVP
 */
// import jsPDF from 'jspdf';
// import html2canvas from 'html2canvas';
import { RAGQueryResponse } from '../api/types';

// PDF generation options
export interface PDFOptions {
  title?: string;
  subject?: string;
  author?: string;
  keywords?: string;
  creator?: string;
  includeTimestamp?: boolean;
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'letter' | 'legal';
  quality?: number; // 1-4, with 4 being highest quality
}

/**
 * Default PDF options
 */
const defaultOptions: PDFOptions = {
  author: 'JurisAI',
  creator: 'JurisAI Document System',
  includeTimestamp: true,
  orientation: 'portrait',
  format: 'a4',
  quality: 2
};

// Mock jsPDF class for type compatibility
class MockPDF {
  constructor() {}
  // Add minimal required methods
  setProperties() { return this; }
  addPage() { return this; }
  text() { return this; }
  addImage() { return this; }
  save() {}
}

// Type compatibility
type jsPDF = MockPDF;

/**
 * Generates a PDF from an HTML element
 * @param element - HTML element to convert to PDF
 * @param options - PDF generation options
 * @returns Promise resolving to the generated PDF document
 */
export function generatePDFFromElement(
  element: HTMLElement,
  options: PDFOptions = {}
): Promise<jsPDF> {
  console.warn('PDF generation is disabled in the MVP');
  return Promise.resolve(new MockPDF());
}

/**
 * Helper function to add canvas content to PDF with pagination
 */
function addContentToPDF(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  imgWidth: number,
  imgHeight: number,
  pageHeight: number
): jsPDF {
  console.warn('PDF generation is disabled in the MVP');
  return pdf;
}

/**
 * Generates a PDF from RAG query response
 * @param responseContent - HTML element containing the response
 * @param queryParams - The query parameters used
 * @param response - The RAG query response object
 * @returns Promise resolving to the generated PDF
 */
export function generateRAGQueryPDF(
  responseContent: HTMLElement,
  query: string,
  response: RAGQueryResponse
): Promise<jsPDF> {
  console.warn('PDF generation is disabled in the MVP');
  return Promise.resolve(new MockPDF());
}

/**
 * Downloads a PDF with a specific filename
 * @param pdf - The jsPDF document object
 * @param filename - Name for the downloaded file (without extension)
 */
export function downloadPDF(pdf: jsPDF, filename: string = 'document'): void {
  console.warn('PDF download is disabled in the MVP');
  return;
}
