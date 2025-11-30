'use client';

import React, { memo, useState, useCallback, useEffect } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Wallet,
  Search,
  TrendingUp,
  Shield,
  Zap,
  ArrowRight,
  Check,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  content: React.ReactNode;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
}

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  currentStep?: number;
}

const STORAGE_KEY = 'pendle-onboarding-completed';

const StepIndicator = memo(function StepIndicator({
  steps,
  currentStep,
  onStepClick,
}: {
  steps: OnboardingStep[];
  currentStep: number;
  onStepClick?: (index: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <button
            key={step.id}
            onClick={() => onStepClick?.(index)}
            disabled={!onStepClick || index > currentStep}
            className={`relative flex items-center ${
              index < steps.length - 1 ? 'pr-8' : ''
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                isCompleted
                  ? 'bg-green-500 text-white'
                  : isCurrent
                    ? 'bg-blue-600 text-white ring-4 ring-blue-200 dark:ring-blue-900'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
            >
              {isCompleted ? (
                <Check className="w-5 h-5" />
              ) : (
                <span className="text-sm font-semibold">{index + 1}</span>
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`absolute left-10 w-8 h-0.5 ${
                  isCompleted
                    ? 'bg-green-500'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
});

const WelcomeContent = memo(function WelcomeContent() {
  return (
    <div className="text-center">
      <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <Sparkles className="w-12 h-12 text-white" />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Welcome to Pendle Yield Navigator
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
        Discover the best yield opportunities on Pendle. We'll help you understand
        PT/YT strategies and find the perfect investments for your portfolio.
      </p>
      <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <Shield className="w-8 h-8 mx-auto text-blue-600 dark:text-blue-400 mb-2" />
          <p className="text-xs font-medium text-blue-800 dark:text-blue-300">Fixed Yields</p>
        </div>
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
          <Zap className="w-8 h-8 mx-auto text-purple-600 dark:text-purple-400 mb-2" />
          <p className="text-xs font-medium text-purple-800 dark:text-purple-300">Yield Trading</p>
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <TrendingUp className="w-8 h-8 mx-auto text-green-600 dark:text-green-400 mb-2" />
          <p className="text-xs font-medium text-green-800 dark:text-green-300">Smart Strategies</p>
        </div>
      </div>
    </div>
  );
});

const UnderstandPTYTContent = memo(function UnderstandPTYTContent() {
  return (
    <div>
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-blue-900 dark:text-blue-100">Principal Token (PT)</h4>
              <span className="text-xs text-blue-600 dark:text-blue-400">Low Risk</span>
            </div>
          </div>
          <p className="text-sm text-blue-800 dark:text-blue-300 mb-4">
            Buy PT at a discount and redeem for $1 at maturity. Your yield is locked in from day one.
          </p>
          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <span className="font-semibold">Example:</span> Buy PT at $0.95 → Get $1.00 at maturity = 5.26% guaranteed return
            </p>
          </div>
        </div>

        <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-600 rounded-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-purple-900 dark:text-purple-100">Yield Token (YT)</h4>
              <span className="text-xs text-purple-600 dark:text-purple-400">Higher Risk</span>
            </div>
          </div>
          <p className="text-sm text-purple-800 dark:text-purple-300 mb-4">
            Collect all yield generated by the underlying asset until maturity. Returns vary based on actual yields.
          </p>
          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <span className="font-semibold">Example:</span> YT cost $0.05 → Collect 15% yield over 90 days = Variable profit
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
          <h4 className="font-semibold text-green-900 dark:text-green-100">Balanced Strategy</h4>
        </div>
        <p className="text-sm text-green-800 dark:text-green-300">
          Split your investment between PT and YT to balance risk and reward. Start with 80% PT / 20% YT for a conservative approach.
        </p>
      </div>
    </div>
  );
});

const DiscoverContent = memo(function DiscoverContent() {
  return (
    <div>
      <div className="space-y-4 mb-6">
        <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
            <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
              1. Connect Your Wallet
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              We'll analyze your holdings and show personalized recommendations
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
              2. Review Opportunities
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              See strategies tailored to your assets with expected APY and risk levels
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
            <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
              3. Invest with One Click
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Choose your strategy, set allocation, and execute directly from our interface
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
            <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
              4. Track & Manage
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Monitor your positions in the Portfolio view and get alerts for maturing investments
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2 mb-2">
          <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Pro Tip</span>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Look for the "Best PT" tag on pools for stable, guaranteed returns. "Best YT" pools are great for aggressive yield farming.
        </p>
      </div>
    </div>
  );
});

const ReadyContent = memo(function ReadyContent() {
  return (
    <div className="text-center">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
        <Check className="w-10 h-10 text-white" />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        You're All Set!
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
        Start exploring yield opportunities and make your first investment. We're here to help you maximize your returns.
      </p>

      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
        <a
          href="/opportunities"
          className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all group"
        >
          <Search className="w-6 h-6 mx-auto mb-2" />
          <p className="text-sm font-medium">Find Opportunities</p>
          <ArrowRight className="w-4 h-4 mx-auto mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
        <a
          href="/portfolio"
          className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl transition-all group"
        >
          <Wallet className="w-6 h-6 mx-auto mb-2" />
          <p className="text-sm font-medium">View Portfolio</p>
          <ArrowRight className="w-4 h-4 mx-auto mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        You can revisit this guide anytime from the Help menu
      </p>
    </div>
  );
});

export const OnboardingWizard = memo(function OnboardingWizard({
  isOpen,
  onClose,
  onComplete,
  currentStep: initialStep = 0,
}: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome',
      description: 'Get started with Pendle',
      icon: Sparkles,
      content: <WelcomeContent />,
    },
    {
      id: 'understand',
      title: 'PT & YT Explained',
      description: 'Learn the basics',
      icon: HelpCircle,
      content: <UnderstandPTYTContent />,
    },
    {
      id: 'discover',
      title: 'How It Works',
      description: 'Your investment journey',
      icon: Search,
      content: <DiscoverContent />,
    },
    {
      id: 'ready',
      title: 'Ready to Start',
      description: 'Begin investing',
      icon: Check,
      content: <ReadyContent />,
    },
  ];

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Mark as completed
      localStorage.setItem(STORAGE_KEY, 'true');
      onComplete();
    }
  }, [currentStep, steps.length, onComplete]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  if (!isOpen) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {step.title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {step.description}
            </p>
          </div>
          <button
            onClick={handleSkip}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Skip tutorial"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 pt-6">
          <StepIndicator
            steps={steps}
            currentStep={currentStep}
            onStepClick={setCurrentStep}
          />
        </div>

        {/* Content */}
        <div className="p-6">
          {step.content}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              currentStep === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-3">
            {!isLastStep && (
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
              >
                Skip Tutorial
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              {isLastStep ? 'Get Started' : 'Continue'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

// Hook to manage onboarding state
export function useOnboarding() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(true);

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    setHasCompleted(completed === 'true');

    // Auto-open for first-time users after a short delay
    if (!completed) {
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const openOnboarding = useCallback(() => setIsOpen(true), []);
  const closeOnboarding = useCallback(() => setIsOpen(false), []);
  const completeOnboarding = useCallback(() => {
    setHasCompleted(true);
    setIsOpen(false);
  }, []);
  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHasCompleted(false);
  }, []);

  return {
    isOpen,
    hasCompleted,
    openOnboarding,
    closeOnboarding,
    completeOnboarding,
    resetOnboarding,
  };
}

export default OnboardingWizard;
