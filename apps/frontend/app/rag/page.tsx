'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import RAGQueryForm from '@/components/rag/RAGQueryForm';
import VectorIndexManager from '@/components/rag/VectorIndexManager';

// Demo data - In a real application, these would be fetched from the API
const availableDocumentTypes = [
  'Case', 
  'Statute', 
  'Regulation', 
  'Contract', 
  'Legal Opinion',
  'Article'
];

const availableJurisdictions = [
  'United States', 
  'United Kingdom', 
  'European Union', 
  'Canada', 
  'Australia',
  'International'
];

export default function RAGPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Retrieval-Augmented Generation</h1>
        <p className="mt-2 text-lg text-gray-600">
          Utilize our powerful RAG system to query legal documents, generate summaries, and extract key information.
        </p>
      </div>

      <Tabs defaultValue="query" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-3">
          <TabsTrigger value="query">Query Documents</TabsTrigger>
          <TabsTrigger value="management">Vector Index Management</TabsTrigger>
          <TabsTrigger value="documentation">Documentation</TabsTrigger>
        </TabsList>
        
        <TabsContent value="query" className="mt-6">
          <RAGQueryForm 
            availableDocumentTypes={availableDocumentTypes} 
            availableJurisdictions={availableJurisdictions} 
          />
        </TabsContent>
        
        <TabsContent value="management" className="mt-6">
          <VectorIndexManager 
            availableDocumentTypes={availableDocumentTypes} 
            availableJurisdictions={availableJurisdictions} 
          />
        </TabsContent>
        
        <TabsContent value="documentation" className="mt-6">
          <div className="prose max-w-none rounded-md border border-gray-200 bg-white p-6 shadow-sm">
            <h2>Using the RAG System</h2>
            <p>
              The Retrieval-Augmented Generation (RAG) system enhances language model responses by retrieving relevant context 
              from your document corpus. This allows the system to provide accurate, up-to-date, and domain-specific responses.
            </p>
            
            <h3>Querying Documents</h3>
            <p>
              The Query tab allows you to:
            </p>
            <ul>
              <li>Ask legal questions against your document corpus</li>
              <li>Filter by document types and jurisdictions</li>
              <li>Adjust generation parameters such as temperature</li>
              <li>View source documents that informed the response</li>
            </ul>
            
            <h3>Managing the Vector Index</h3>
            <p>
              The Vector Index Management tab provides tools to:
            </p>
            <ul>
              <li>Monitor the status of your vector index</li>
              <li>Generate embeddings for individual documents</li>
              <li>Rebuild the entire vector index with optional filters</li>
              <li>View statistics on indexed documents</li>
            </ul>
            
            <h3>Best Practices</h3>
            <ol>
              <li>
                <strong>Be specific in queries</strong> - The more specific your query, the more relevant the results.
              </li>
              <li>
                <strong>Use filters</strong> - Narrow down the document corpus for more relevant context.
              </li>
              <li>
                <strong>Adjust temperature</strong> - Lower for factual responses, higher for creative exploration.
              </li>
              <li>
                <strong>Review sources</strong> - Always check the source documents that informed the response.
              </li>
              <li>
                <strong>Index management</strong> - Regularly update the vector index when adding new documents.
              </li>
            </ol>
            
            <h3>Technical Information</h3>
            <p>
              Our RAG implementation uses:
            </p>
            <ul>
              <li>Dense passage retrieval with vector embeddings</li>
              <li>Similarity search using cosine similarity</li>
              <li>Dynamic context selection based on relevance scores</li>
              <li>Large Language Model (LLM) for synthesis and generation</li>
            </ul>
            
            <div className="not-prose rounded-md bg-blue-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-800">Note</h4>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      The RAG system is continuously improving. For technical assistance or to report issues, 
                      please contact the support team.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
