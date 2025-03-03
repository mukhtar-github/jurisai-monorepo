import Link from "next/link";
import Image from "next/image";

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/research" className="card hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Legal Research</h3>
            <p className="text-gray-600">Search and analyze legal documents with AI assistance.</p>
          </Link>

          <Link href="/documents" className="card hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Document Management</h3>
            <p className="text-gray-600">Upload, organize, and manage your legal documents.</p>
          </Link>

          <Link href="/drafting" className="card hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Document Drafting</h3>
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
