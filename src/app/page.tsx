/**
 * src/app/page.tsx: Landing page component
 * 
 * Main landing page that introduces the GTM Deep Diver platform
 * and provides navigation to sign in or learn more about features.
 */

import { SignInButton, SignUpButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Target, TrendingUp, Users, FileText } from 'lucide-react';

export default async function HomePage() {
  // Redirect authenticated users to dashboard
  const { userId } = auth();
  if (userId) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Target className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">GTM Deep Diver</h1>
          </div>
          <div className="flex items-center space-x-4">
            <SignInButton mode="modal">
              <Button variant="ghost">Sign In</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button>Get Started</Button>
            </SignUpButton>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Turn Research Into
            <span className="text-blue-600"> Revenue</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Guide your sales team through systematic company deep-dives. 
            Transform public evidence into pain-point maps and quantified ROI business cases.
          </p>
          <SignUpButton mode="modal">
            <Button size="lg" className="text-lg px-8 py-3">
              Start Your First Research Project
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </SignUpButton>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center">
            <CardHeader>
              <Target className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Guided Research</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                7-phase wizard walks you through systematic company analysis
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <TrendingUp className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <CardTitle>ROI Calculator</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Quantify value with low/likely/high scenarios and payback analysis
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Users className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <CardTitle>Stakeholder Mapping</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Identify decision makers and tailor outreach to each persona
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <FileText className="h-12 w-12 text-orange-600 mx-auto mb-4" />
              <CardTitle>Export & Share</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Generate professional briefs with source traceability
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Process Flow */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-3xl font-bold text-center mb-8">How It Works</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h4 className="text-xl font-semibold mb-2">Gather Evidence</h4>
              <p className="text-gray-600">
                Collect URLs, files, and notes about your target company and industry
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h4 className="text-xl font-semibold mb-2">Map Pain Points</h4>
              <p className="text-gray-600">
                AI helps extract signals and map them to business pain points with confidence scores
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h4 className="text-xl font-semibold mb-2">Generate Outreach</h4>
              <p className="text-gray-600">
                Create persona-specific emails and DMs with ROI justification and source citations
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-gray-600">
          <p>&copy; 2024 GTM Deep Diver. Built for sales professionals who value systematic research.</p>
        </div>
      </footer>
    </div>
  );
}
