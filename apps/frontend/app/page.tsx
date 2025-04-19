import Link from "next/link";
import Image from "next/image";
import { Sparkles, Search, FileText, PenTool } from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-8">
      {/* Hero section */}
      <section className="card bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="mb-6 md:mb-0 md:w-1/2">
            <h1 className="text-3xl font-bold mb-2">Welcome to JurisAI</h1>
            <p className="text-lg mb-6">
              Your AI-powered legal assistant for professionals in Nigeria and Africa.
            </p>
            <Link href="/research" className="btn bg-white text-blue-700 hover:bg-gray-100">
              Start Researching
            </Link>
          </div>
          <div className="md:w-1/2 flex justify-center">
            <div className="h-48 w-48 bg-white/10 rounded-full flex items-center justify-center">
              <div className="text-4xl font-bold">JurisAI</div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick access section */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/research" className="card hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-lg font-semibold mb-2">Legal Research</h3>
            <p className="text-gray-600">Search and analyze legal documents with AI assistance.</p>
          </Link>

          <Link href="/documents" className="card hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-lg font-semibold mb-2">Document Management</h3>
            <p className="text-gray-600">Upload, organize, and manage your legal documents.</p>
          </Link>

          <Link href="/summarize" className="card hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-lg font-semibold mb-2">Summarization</h3>
            <p className="text-gray-600">Generate concise summaries of legal documents with key points preserved.</p>
          </Link>

          <Link href="/drafting" className="card hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4">
              <PenTool className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-lg font-semibold mb-2">Document Drafting</h3>
            <p className="text-gray-600">Generate and edit legal documents with AI assistance.</p>
          </Link>
        </div>
      </section>

      {/* Recent activity - Placeholder for future implementation */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
        <div className="card">
          <p className="text-gray-500 italic">Your recent activities will appear here.</p>
        </div>
      </section>
    </div>
  );
}
