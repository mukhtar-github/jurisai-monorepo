import type { Metadata } from "next";
// Removing Google Fonts import to fix build issues
// import { Inter } from "next/font/google";
import "./globals.css";
import RootProvider from "../lib/providers/RootProvider";
import Notifications from "@/components/ui/Notifications";
import { MobileNavigation } from "@/components/ui/mobile-nav";

// Replace Google Font with a local font-family fallback
// const inter = Inter({ 
//   subsets: ["latin"],
//   variable: "--font-inter",
// });

export const metadata: Metadata = {
  title: "JurisAI - Legal Assistant",
  description: "AI-powered legal assistant for professionals in Nigeria and Africa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <RootProvider>
          <Notifications />
          <div className="flex h-screen overflow-hidden">
            {/* Sidebar - Will be replaced with a component */}
            <div className="w-64 bg-gray-900 text-white p-4 hidden md:block">
              <div className="text-2xl font-bold mb-8">JurisAI</div>
              <nav>
                <ul className="space-y-2">
                  <li>
                    <a href="/" className="block py-2 px-4 rounded hover:bg-gray-800">Home</a>
                  </li>
                  <li>
                    <a href="/research" className="block py-2 px-4 rounded hover:bg-gray-800">Legal Research</a>
                  </li>
                  <li>
                    <a href="/documents" className="block py-2 px-4 rounded hover:bg-gray-800">Documents</a>
                  </li>
                  <li>
                    <a href="/summarize" className="block py-2 px-4 rounded hover:bg-gray-800">Summarization</a>
                  </li>
                  <li>
                    <a href="/drafting" className="block py-2 px-4 rounded hover:bg-gray-800">Document Drafting</a>
                  </li>
                  
                  <li className="mt-8 pt-4 border-t border-gray-700">
                    <div className="text-xs uppercase text-gray-500 font-semibold px-4 mb-2">Developer Tools</div>
                  </li>
                  <li>
                    <a href="/diagnostics" className="block py-2 px-4 rounded hover:bg-gray-800 text-gray-400 hover:text-white">
                      System Diagnostics
                    </a>
                  </li>
                  <li>
                    <a href="/api-test" className="block py-2 px-4 rounded hover:bg-gray-800 text-gray-400 hover:text-white">
                      API Test
                    </a>
                  </li>
                </ul>
              </nav>
            </div>
            
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Navbar - With mobile navigation */}
              <header className="bg-white border-b h-16 flex items-center justify-between px-6">
                <div className="flex items-center">
                  <MobileNavigation />
                  <div className="md:hidden text-xl font-bold ml-2">JurisAI</div>
                </div>
                <div className="flex items-center">
                  <button className="p-2 rounded hover:bg-gray-100">
                    {/* Placeholder for user menu */}
                    <span className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                      U
                    </span>
                  </button>
                </div>
              </header>
              
              {/* Main content with improved container */}
              <main className="flex-1 overflow-y-auto bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </RootProvider>
      </body>
    </html>
  );
}
