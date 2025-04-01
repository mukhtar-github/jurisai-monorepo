/**
 * PDF Service for JurisAI
 * Provides utilities for creating and downloading PDFs from application content
 */
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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

/**
 * Generates a PDF from an HTML element
 * @param element - HTML element to convert to PDF
 * @param options - PDF generation options
 * @returns Promise resolving to the generated PDF document
 */
export const generatePDFFromElement = async (
  element: HTMLElement,
  options: PDFOptions = {}
): Promise<jsPDF> => {
  const mergedOptions = { ...defaultOptions, ...options };
  const { orientation, format, quality } = mergedOptions;
  
  try {
    // Create canvas from HTML
    const scale = quality || 2;
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });
    
    // Create PDF
    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: format,
    });
    
    // Set PDF metadata
    const timestamp = mergedOptions.includeTimestamp ? new Date().toISOString() : '';
    pdf.setProperties({
      title: mergedOptions.title || `JurisAI Document - ${timestamp}`,
      subject: mergedOptions.subject || '',
      author: mergedOptions.author || 'JurisAI',
      keywords: mergedOptions.keywords || 'legal, document',
      creator: mergedOptions.creator || 'JurisAI Document System',
    });
    
    // Calculate page dimensions
    const imgWidth = orientation === 'portrait' ? 210 : 297; // A4 width in mm
    const pageHeight = orientation === 'portrait' ? 295 : 210; // A4 height in mm, minus a small margin
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    return addContentToPDF(pdf, canvas, imgWidth, imgHeight, pageHeight);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

/**
 * Helper function to add canvas content to PDF with pagination
 */
const addContentToPDF = (
  pdf: jsPDF, 
  canvas: HTMLCanvasElement, 
  imgWidth: number, 
  imgHeight: number, 
  pageHeight: number
): jsPDF => {
  // Get image data from canvas
  const imgData = canvas.toDataURL('image/png');
  
  // Add content with pagination support
  let heightLeft = imgHeight;
  let position = 0;
  
  // Add first page
  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;
  
  // Add additional pages if needed
  while (heightLeft > 0) {
    position = -pageHeight; // Move to next page
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }
  
  return pdf;
};

/**
 * Generates a PDF from RAG query response
 * @param responseContent - HTML element containing the response
 * @param queryParams - The query parameters used
 * @param response - The RAG query response object
 * @returns Promise resolving to the generated PDF
 */
export const generateRAGQueryPDF = async (
  responseContent: HTMLElement,
  query: string,
  response: RAGQueryResponse
): Promise<jsPDF> => {
  // Create a temporary element to style for PDF
  const pdfContent = document.createElement('div');
  pdfContent.style.padding = '20px';
  pdfContent.style.fontFamily = 'Arial, sans-serif';
  pdfContent.style.fontSize = '12pt';
  
  // Add header
  const header = document.createElement('div');
  header.style.marginBottom = '20px';
  header.style.borderBottom = '1px solid #ccc';
  header.style.paddingBottom = '10px';
  
  const title = document.createElement('h1');
  title.style.fontSize = '18pt';
  title.style.marginBottom = '5px';
  title.textContent = 'JurisAI Legal Query Response';
  header.appendChild(title);
  
  const dateElem = document.createElement('p');
  dateElem.style.fontSize = '10pt';
  dateElem.style.color = '#666';
  dateElem.textContent = `Generated on: ${new Date().toLocaleString()}`;
  header.appendChild(dateElem);
  
  // Add query section
  const querySection = document.createElement('div');
  querySection.style.marginBottom = '20px';
  querySection.style.padding = '10px';
  querySection.style.backgroundColor = '#f5f5f5';
  querySection.style.borderRadius = '4px';
  
  const queryTitle = document.createElement('h2');
  queryTitle.style.fontSize = '14pt';
  queryTitle.style.marginBottom = '5px';
  queryTitle.textContent = 'Query:';
  querySection.appendChild(queryTitle);
  
  const queryText = document.createElement('p');
  queryText.textContent = query;
  querySection.appendChild(queryText);
  
  // Model info
  if (response.model) {
    const modelInfo = document.createElement('p');
    modelInfo.style.fontSize = '10pt';
    modelInfo.style.color = '#666';
    modelInfo.textContent = `Model: ${response.model} | Processing time: ${response.processing_time.toFixed(2)}s`;
    querySection.appendChild(modelInfo);
  }
  
  // Add response content
  const responseSection = document.createElement('div');
  responseSection.style.marginBottom = '20px';
  responseSection.appendChild(responseContent.cloneNode(true));
  
  // Add sources if available
  const sourcesSection = document.createElement('div');
  if ((response.sources && response.sources.length > 0) || 
      (response.source_documents && response.source_documents.length > 0)) {
    const sourcesTitle = document.createElement('h2');
    sourcesTitle.style.fontSize = '14pt';
    sourcesTitle.style.marginTop = '20px';
    sourcesTitle.style.marginBottom = '10px';
    sourcesTitle.style.borderTop = '1px solid #ccc';
    sourcesTitle.style.paddingTop = '10px';
    sourcesTitle.textContent = 'Sources';
    sourcesSection.appendChild(sourcesTitle);
    
    const sourcesList = document.createElement('ul');
    
    // Handle new sources format
    if (response.sources && response.sources.length > 0) {
      response.sources.forEach(source => {
        const item = document.createElement('li');
        item.style.marginBottom = '5px';
        item.textContent = `${source.title || `Document #${source.document_id}`}`;
        
        if (source.metadata) {
          const meta = document.createElement('span');
          meta.style.color = '#666';
          meta.textContent = ` - ${source.metadata}`;
          item.appendChild(meta);
        }
        
        sourcesList.appendChild(item);
      });
    }
    
    // Handle legacy source_documents format
    if (response.source_documents && response.source_documents.length > 0) {
      response.source_documents.forEach(source => {
        const item = document.createElement('li');
        item.style.marginBottom = '5px';
        const title = source.document?.title || `Document #${source.document?.id || 'Unknown'}`;
        const relevance = source.relevance ? ` (Relevance: ${(source.relevance * 100).toFixed(1)}%)` : '';
        item.textContent = `${title}${relevance}`;
        sourcesList.appendChild(item);
      });
    }
    
    sourcesSection.appendChild(sourcesList);
  }
  
  // Add footer
  const footer = document.createElement('div');
  footer.style.marginTop = '20px';
  footer.style.borderTop = '1px solid #ccc';
  footer.style.paddingTop = '10px';
  footer.style.fontSize = '10pt';
  footer.style.color = '#666';
  footer.style.textAlign = 'center';
  footer.textContent = 'Generated by JurisAI - Legal Document System';
  
  // Assemble the document
  pdfContent.appendChild(header);
  pdfContent.appendChild(querySection);
  pdfContent.appendChild(responseSection);
  pdfContent.appendChild(sourcesSection);
  pdfContent.appendChild(footer);
  
  // Append to body temporarily (needed for html2canvas), but make it invisible
  pdfContent.style.position = 'absolute';
  pdfContent.style.left = '-9999px';
  document.body.appendChild(pdfContent);
  
  try {
    // Generate PDF with custom styling
    const pdf = await generatePDFFromElement(pdfContent, {
      title: 'JurisAI Legal Query Response',
      subject: query,
      keywords: 'legal, rag, query, ai response',
      quality: 3 // Higher quality for text
    });
    
    // Remove temporary element
    document.body.removeChild(pdfContent);
    
    return pdf;
  } catch (error) {
    // Clean up on error
    if (document.body.contains(pdfContent)) {
      document.body.removeChild(pdfContent);
    }
    throw error;
  }
};

/**
 * Downloads a PDF with a specific filename
 * @param pdf - The jsPDF document object
 * @param filename - Name for the downloaded file (without extension)
 */
export const downloadPDF = (pdf: jsPDF, filename: string = 'document'): void => {
  try {
    const timestamp = new Date().getTime();
    const sanitizedFilename = filename.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    pdf.save(`${sanitizedFilename}-${timestamp}.pdf`);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw error;
  }
};
