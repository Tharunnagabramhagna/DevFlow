import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthPageShell } from '@/components/auth/AuthPageShell';
import { RoleWelcomeSelector } from '@/components/auth/RoleWelcomeSelector';
import { useAuth } from '@/contexts/AuthContext';
import { EffectiveRole } from '@/types';

export const GetStartedPage: React.FC = () => {
  const navigate = useNavigate();
  const { continueAsGuest } = useAuth();

  const [isGuestSelectOpen, setIsGuestSelectOpen] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectRole = (role: EffectiveRole) => {
    navigate(role === 'CLIENT' ? '/signup/client' : '/signup/developer');
  };

  const handleContinueAsGuest = async (persona: EffectiveRole) => {
    setGuestLoading(true);
    setError(null);
    try {
      await continueAsGuest(persona);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize guest demo session. Please try again.');
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <AuthPageShell width="wide">
      <RoleWelcomeSelector
        title="Get Started with DevFlow"
        subtitle="Select how you plan to use DevFlow to create your account or explore in Demo Mode."
        error={error}
        isGuestSelectOpen={isGuestSelectOpen}
        guestLoading={guestLoading}
        bottomPromptText="Already have an account?"
        bottomLinkLabel="Login"
        bottomLinkTo="/login"
        onSelectRole={handleSelectRole}
        onToggleGuestSelect={(open) => {
          setError(null);
          setIsGuestSelectOpen(open);
        }}
        onContinueAsGuest={handleContinueAsGuest}
        clientTitle="Client Account"
        clientBadge="HIRING / MANAGEMENT"
        developerTitle="Developer Account"
        developerBadge="BUILDING / CODE"
      />
    </AuthPageShell>
  );
};

export default GetStartedPage;

