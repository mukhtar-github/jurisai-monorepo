import type { Metadata } from "next";
// Removing Google Fonts import to fix build issues
// import { Inter } from "next/font/google";
import "./globals.css";
import RootProvider from "../lib/providers/RootProvider";
import Notifications from "@/components/ui/Notifications";

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
                </ul>
              </nav>
            </div>
            
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Navbar - Will be replaced with a component */}
              <header className="bg-white border-b h-16 flex items-center justify-between px-6">
                <div className="md:hidden text-xl font-bold">JurisAI</div>
                <div className="flex items-center">
                  <button className="p-2 rounded hover:bg-gray-100">
                    {/* Placeholder for user menu */}
                    <span className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                      U
                    </span>
                  </button>
                </div>
              </header>
              
              {/* Main content */}
              <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
                {children}
              </main>
            </div>
          </div>
        </RootProvider>
      </body>
    </html>
  );
}
