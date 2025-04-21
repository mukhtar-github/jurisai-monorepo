'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, Home, Search, FileText, Sparkles, Edit } from 'lucide-react';
import { Button } from './button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './sheet';

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  children: React.ReactNode;
  onClick?: () => void;
}

const NavItem = ({ href, icon: Icon, children, onClick }: NavItemProps) => (
  <Link 
    href={href} 
    className="flex items-center space-x-3 py-2 px-3 rounded-md hover:bg-gray-800 transition-colors"
    onClick={onClick}
  >
    <Icon className="h-5 w-5" />
    <span>{children}</span>
  </Link>
);

export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  
  const closeMenu = () => setIsOpen(false);
  
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden text-gray-700" 
          onClick={() => setIsOpen(true)}
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Open navigation menu</span>
        </Button>
      </SheetTrigger>
      
      <SheetContent side="left" className="bg-gray-900 text-white p-0 max-w-[280px] sm:max-w-[320px]">
        <SheetHeader className="p-4 border-b border-gray-800">
          <SheetTitle className="text-white text-xl font-bold">JurisAI</SheetTitle>
        </SheetHeader>
        
        <nav className="flex flex-col space-y-1 p-4">
          <NavItem href="/" icon={Home} onClick={closeMenu}>Home</NavItem>
          <NavItem href="/research" icon={Search} onClick={closeMenu}>Legal Research</NavItem>
          <NavItem href="/documents" icon={FileText} onClick={closeMenu}>Documents</NavItem>
          <NavItem href="/summarize" icon={Sparkles} onClick={closeMenu}>Summarization</NavItem>
          <NavItem href="/drafting" icon={Edit} onClick={closeMenu}>Document Drafting</NavItem>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
